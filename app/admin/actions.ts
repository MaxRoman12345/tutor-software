"use server";

import { createClient } from "@/lib/server";
import { EXAM_BOARDS } from "@/lib/exam-board";

export type AdminTutor = {
  id: string;
  name: string | null;
  email: string | null;
};

export type AdminStudent = {
  id: string;
  name: string | null;
  email: string | null;
  exam_board: string | null;
  tutor: AdminTutor | null;
};

export type AdminData = {
  tutors: AdminTutor[];
  students: AdminStudent[];
};

export async function getAdminData(): Promise<AdminData> {
  const supabase = await createClient();

  const [
    { data: tutors, error: tutorsError },
    { data: students, error: studentsError },
    { data: links, error: linksError },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email")
      .eq("role", "tutor")
      .order("name"),
    supabase
      .from("users")
      .select("id, name, email, exam_board")
      .eq("role", "student")
      .order("name"),
    supabase.from("student_tutors").select("student_id, tutor_id"),
  ]);

  if (tutorsError || studentsError || linksError) {
    console.error(tutorsError || studentsError || linksError);
    return { tutors: [], students: [] };
  }

  const tutorById = new Map((tutors ?? []).map((t) => [t.id, t]));
  const linkByStudent = new Map(
    (links ?? []).map((l) => [l.student_id, l.tutor_id]),
  );

  const studentsWithTutor: AdminStudent[] = (students ?? []).map((s) => {
    const tutorId = linkByStudent.get(s.id);
    const tutor = tutorId ? (tutorById.get(tutorId) ?? null) : null;
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      exam_board: s.exam_board,
      tutor: tutor
        ? { id: tutor.id, name: tutor.name, email: tutor.email }
        : null,
    };
  });

  return { tutors: tutors ?? [], students: studentsWithTutor };
}

export async function assignStudentToTutor(studentId: string, tutorId: string) {
  const supabase = await createClient();

  // one tutor per student - clear any existing link first
  const { error: deleteError } = await supabase
    .from("student_tutors")
    .delete()
    .eq("student_id", studentId);

  if (deleteError) return { error: deleteError.message };

  const { error: insertError } = await supabase
    .from("student_tutors")
    .insert({ student_id: studentId, tutor_id: tutorId });

  return { error: insertError?.message ?? null };
}

/** Admin sets (or clears, with null) a student's exam board. */
export async function setStudentExamBoard(
  studentId: string,
  examBoard: string | null,
) {
  const supabase = await createClient();

  if (examBoard !== null && !EXAM_BOARDS.some((b) => b.value === examBoard)) {
    return { error: "Invalid exam board" };
  }

  const { error } = await supabase
    .from("users")
    .update({ exam_board: examBoard })
    .eq("id", studentId);

  return { error: error?.message ?? null };
}

export async function unassignStudent(studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_tutors")
    .delete()
    .eq("student_id", studentId);

  return { error: error?.message ?? null };
}
