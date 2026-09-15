"use server";

import { createClient } from "@/lib/server";
import { fetchAllRows } from "@/lib/fetch-all";
import { compareQuestionNumber } from "@/components/students/materials/types";

export type Paper = {
  id: string;
  gcse_alevel: string | null;
  paper_year: string | null;
  exam_board: string | null;
  // paper_module in the DB (text): an A-Level module code or a GCSE paper number.
  module: string | null;
  spec_level: string | null;
  qp_path: string | null;
  ms_path: string | null;
};

export type Outcome = "correct" | "partial" | "incorrect";

export type QuestionRow = {
  id: string;
  question_number: string | null;
  difficulty: number | null;
  topics: { topic: string | null; section_course: string | null } | null;
  outcome: Outcome | null;
  note: string | null;
};

export type PaperProgress = {
  total: number;
  correct: number;
  partial: number;
  incorrect: number;
};

/** The signed-in student's exam board, used to highlight their own programme. */
export async function getMyExamBoard(): Promise<string | null> {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("users")
    .select("exam_board")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("getMyExamBoard error:", error);
    return null;
  }
  return data?.exam_board ?? null;
}

export async function getPapers(): Promise<Paper[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("past_paper")
    .select(
      "id, gcse_alevel, paper_year, exam_board, module:paper_module, spec_level, qp_path, ms_path",
    )
    .order("paper_year", { ascending: false });

  if (error) {
    console.error("getPapers error:", error);
    return [];
  }
  return (data ?? []) as unknown as Paper[];
}

/**
 * studentId: optional. Omit for the logged-in student's own progress.
 * Pass a specific student's id (tutor view) to see their progress instead -
 * relies on RLS to enforce the caller is allowed to read that student's rows.
 *
 * Keyed by past_paper id — every question belongs to exactly one paper.
 */
export async function getAllProgress(
  studentId?: string,
): Promise<Record<string, PaperProgress>> {
  const supabase = await createClient();

  let targetId = studentId;
  if (!targetId) {
    const { data: claims } = await supabase.auth.getClaims();
    targetId = claims?.claims?.sub;
  }
  if (!targetId) return {};

  // Both are whole-table reads, so they have to be paged — see lib/fetch-all.ts.
  const [questions, progress] = await Promise.all([
    fetchAllRows<{ id: string; pp_id: string | null }>(
      "getAllProgress questions",
      (from, to) =>
        supabase
          .from("questions")
          .select("id, pp_id")
          .order("id")
          .range(from, to),
    ),
    fetchAllRows<{ question_id: string; outcome: string | null }>(
      "getAllProgress progress",
      (from, to) =>
        supabase
          .from("student_question_progress")
          .select("question_id, outcome")
          .eq("student_id", targetId)
          .order("question_id")
          .range(from, to),
    ),
  ]);

  const outcomeFor = new Map(
    progress.map((p) => [p.question_id, p.outcome as Outcome]),
  );

  const bySource: Record<string, PaperProgress> = {};

  for (const q of questions) {
    const sourceId = q.pp_id;
    if (!sourceId) continue;
    bySource[sourceId] ??= { total: 0, correct: 0, partial: 0, incorrect: 0 };
    bySource[sourceId].total++;

    const outcome = outcomeFor.get(q.id);
    if (outcome === "correct") bySource[sourceId].correct++;
    else if (outcome === "partial") bySource[sourceId].partial++;
    else if (outcome === "incorrect") bySource[sourceId].incorrect++;
  }

  return bySource;
}

/**
 * Loads the questions for one past paper together with the target student's
 * marks. studentId: optional, same convention as getAllProgress above.
 */
async function getQuestionsForSource(
  match: { pp_id: string },
  studentId?: string,
): Promise<QuestionRow[]> {
  const supabase = await createClient();

  let targetId = studentId;
  if (!targetId) {
    const { data: claims } = await supabase.auth.getClaims();
    targetId = claims?.claims?.sub;
  }

  const questionsRes = await supabase
    .from("questions")
    .select("id, question_number, difficulty, topics(topic, section_course)")
    .match(match);

  if (questionsRes.error) {
    console.error("getQuestionsForSource error:", questionsRes.error);
    return [];
  }

  // Only this paper's questions — reading the student's whole progress table
  // here used to hit PostgREST's 1000-row cap and silently drop marks.
  const questionIds = (questionsRes.data ?? []).map((q) => q.id);

  const progressRes = await supabase
    .from("student_question_progress")
    .select("question_id, outcome, note")
    .eq("student_id", targetId)
    .in("question_id", questionIds);

  if (progressRes.error) console.error("progress error:", progressRes.error);

  const progressFor = new Map(
    (progressRes.data ?? []).map((p) => [p.question_id, p]),
  );

  const rows = (questionsRes.data ?? []).map((q) => {
    const p = progressFor.get(q.id);
    return {
      ...q,
      outcome: (p?.outcome as Outcome) ?? null,
      note: p?.note ?? null,
    };
  }) as unknown as QuestionRow[];

  return rows.sort((a, b) =>
    compareQuestionNumber(a.question_number, b.question_number),
  );
}

/** studentId optional — omit for a browse view with no marks. */
export async function getQuestionsForPaper(
  paperId: string,
  studentId?: string,
): Promise<QuestionRow[]> {
  return getQuestionsForSource({ pp_id: paperId }, studentId);
}

export async function setQuestionOutcome(questionId: string, outcome: Outcome) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const studentId = claims?.claims?.sub;
  if (!studentId) return { error: "Not signed in" };

  const { error } = await supabase.from("student_question_progress").upsert(
    {
      student_id: studentId,
      question_id: questionId,
      outcome,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,question_id" },
  );

  if (error) {
    console.error("setQuestionOutcome error:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function clearQuestionOutcome(questionId: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const studentId = claims?.claims?.sub;
  if (!studentId) return { error: "Not signed in" };

  const { error } = await supabase.from("student_question_progress").upsert(
    {
      student_id: studentId,
      question_id: questionId,
      outcome: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,question_id" },
  );

  if (error) {
    console.error("clearQuestionOutcome error:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function setQuestionNote(questionId: string, note: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const studentId = claims?.claims?.sub;
  if (!studentId) return { error: "Not signed in" };

  const { error } = await supabase.from("student_question_progress").upsert(
    {
      student_id: studentId,
      question_id: questionId,
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,question_id" },
  );

  if (error) {
    console.error("setQuestionNote error:", error);
    return { error: error.message };
  }
  return { error: null };
}
