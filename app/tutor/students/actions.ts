"use server";

import { createClient } from "@/lib/server";
import { programmeFilter } from "@/lib/programme";
import { fetchAllRows } from "@/lib/fetch-all";

export type TutorStudent = {
  id: string;
  name: string | null;
  email: string | null;
  exam_board: string | null;
  totalQuestions: number;
  totalAttempted: number;
};

export async function getTutorStudents(): Promise<TutorStudent[]> {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const tutorId = claims?.claims?.sub;
  if (!tutorId) return [];

  const { data: links, error: linksError } = await supabase
    .from("student_tutors")
    .select("student_id")
    .eq("tutor_id", tutorId);

  if (linksError || !links || links.length === 0) {
    if (linksError) console.error(linksError);
    return [];
  }

  const studentIds = links.map((l) => l.student_id);

  const { data: students, error: studentsError } = await supabase
    .from("users")
    .select("id, name, email, exam_board")
    .in("id", studentIds)
    .order("name");

  if (studentsError || !students) {
    console.error(studentsError);
    return [];
  }

  // Counted the same way as the student dashboard so the two views agree:
  // each student is measured against their own programme, not every paper in
  // the database. questions/progress are whole-table reads, so they have to be
  // paged - see lib/fetch-all.ts.
  const [papersRes, questions, progress] = await Promise.all([
    supabase.from("past_paper").select("id, gcse_alevel, exam_board, spec_level"),
    fetchAllRows<{ id: string; pp_id: string | null }>(
      "getTutorStudents questions",
      (from, to) =>
        supabase
          .from("questions")
          .select("id, pp_id")
          .order("id")
          .range(from, to),
    ),
    fetchAllRows<{
      student_id: string;
      question_id: string;
      outcome: string | null;
    }>("getTutorStudents progress", (from, to) =>
      supabase
        .from("student_question_progress")
        .select("student_id, question_id, outcome")
        .in("student_id", studentIds)
        .order("student_id")
        .order("question_id")
        .range(from, to),
    ),
  ]);

  if (papersRes.error)
    console.error("getTutorStudents papers:", papersRes.error);

  const papers = papersRes.data ?? [];

  return students.map((s) => {
    const inProgramme = programmeFilter(s.exam_board);

    const validPaperIds = new Set(
      papers
        .filter((p) => inProgramme(p.gcse_alevel ?? "", p.exam_board ?? "", p.spec_level ?? ""))
        .map((p) => p.id),
    );
    // Programme paper questions for this student's board - mirrors getDashboardData.
    const validQuestionIds = new Set(
      questions
        .filter((q) => q.pp_id && validPaperIds.has(q.pp_id))
        .map((q) => q.id),
    );

    // Only rows that carry an outcome count as attempted - a cleared mark
    // leaves the row behind with a null outcome.
    const totalAttempted = progress.filter(
      (p) =>
        p.student_id === s.id &&
        p.outcome &&
        validQuestionIds.has(p.question_id),
    ).length;

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      exam_board: s.exam_board,
      totalQuestions: validQuestionIds.size,
      totalAttempted,
    };
  });
}
