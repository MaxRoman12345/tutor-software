"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/server";
import { humanize, moduleLabel } from "@/components/students/materials/types";

export type HomeworkPaper = {
  /** past_paper id, or a worksheet id when isWorksheet. */
  ppId: string;
  isWorksheet: boolean;
  label: string;
  qpPath: string | null;
  msPath: string | null;
};

export type HomeworkFile = { path: string; name: string };

export type HomeworkItem = {
  id: string;
  title: string;
  notes: string | null;
  files: HomeworkFile[];
  /** Student's manual "done" tick - the sole source of completion. */
  completed: boolean;
  assignedLabel: string;
  dueLabel: string | null;
  /** Days until due. Negative = overdue. Null if no due date. */
  daysUntilDue: number | null;
  papers: HomeworkPaper[];
  total: number;
  correct: number;
  partial: number;
  incorrect: number;
  marked: number;
  status: "not_started" | "in_progress" | "complete";
  overdue: boolean;
};

function dateLabel(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  });
}

export async function getHomework(studentId: string): Promise<HomeworkItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("homework")
    .select(
      `id, title, notes, assigned_date, due_date, completed,
       homework_papers ( pp_id, worksheet_id,
         past_paper ( gcse_alevel, exam_board, module:paper_module, paper_year, qp_path, ms_path ),
         worksheets ( module, topic_name, qp_path, ms_path ) ),
       homework_files ( path, name )`,
    )
    .eq("student_id", studentId)
    .order("assigned_date", { ascending: false });

  if (error) {
    console.error("getHomework error:", error);
    return [];
  }

  type Row = {
    id: string;
    title: string;
    notes: string | null;
    assigned_date: string;
    due_date: string | null;
    completed: boolean;
    homework_papers: {
      pp_id: string | null;
      worksheet_id: string | null;
      past_paper: {
        gcse_alevel: string | null;
        exam_board: string | null;
        module: string | null;
        paper_year: string | null;
        qp_path: string | null;
        ms_path: string | null;
      } | null;
      worksheets: {
        module: string | null;
        topic_name: string | null;
        qp_path: string | null;
        ms_path: string | null;
      } | null;
    }[];
    homework_files: { path: string; name: string }[];
  };

  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  const paperIds = [
    ...new Set(
      rows.flatMap((r) =>
        (r.homework_papers ?? [])
          .map((p) => p.pp_id)
          .filter((id): id is string => !!id),
      ),
    ),
  ];
  const worksheetIds = [
    ...new Set(
      rows.flatMap((r) =>
        (r.homework_papers ?? [])
          .map((p) => p.worksheet_id)
          .filter((id): id is string => !!id),
      ),
    ),
  ];

  // Progress is derived, not stored: every question in an attached paper or
  // worksheet counts toward the homework, using whatever the student marked.
  const [paperQs, worksheetQs] = await Promise.all([
    paperIds.length > 0
      ? supabase.from("questions").select("id, pp_id").in("pp_id", paperIds)
      : Promise.resolve({ data: [], error: null }),
    worksheetIds.length > 0
      ? supabase
          .from("questions")
          .select("id, worksheet_id")
          .in("worksheet_id", worksheetIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (paperQs.error) console.error("getHomework paper questions:", paperQs.error);
  if (worksheetQs.error)
    console.error("getHomework worksheet questions:", worksheetQs.error);

  // keyed by source id (past_paper id or worksheet id)
  const questionsByPaper = new Map<string, string[]>();
  for (const q of (paperQs.data ?? []) as { id: string; pp_id: string | null }[]) {
    if (!q.pp_id) continue;
    if (!questionsByPaper.has(q.pp_id)) questionsByPaper.set(q.pp_id, []);
    questionsByPaper.get(q.pp_id)!.push(q.id);
  }
  for (const q of (worksheetQs.data ?? []) as {
    id: string;
    worksheet_id: string | null;
  }[]) {
    if (!q.worksheet_id) continue;
    if (!questionsByPaper.has(q.worksheet_id))
      questionsByPaper.set(q.worksheet_id, []);
    questionsByPaper.get(q.worksheet_id)!.push(q.id);
  }

  // Only the questions these homeworks actually cover - reading the student's
  // whole progress table here used to hit PostgREST's 1000-row cap and report
  // completed questions as unmarked.
  const questionIds = [
    ...(paperQs.data ?? []).map((q) => q.id),
    ...(worksheetQs.data ?? []).map((q) => q.id),
  ];

  const progressRes = await supabase
    .from("student_question_progress")
    .select("question_id, outcome")
    .eq("student_id", studentId)
    .in("question_id", questionIds);

  if (progressRes.error)
    console.error("getHomework progress:", progressRes.error);

  const outcomeFor = new Map(
    (progressRes.data ?? []).map((p) => [p.question_id, p.outcome as string]),
  );

  const today = new Date();
  const todayUTC = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  return rows.map((r) => {
    let total = 0;
    let correct = 0;
    let partial = 0;
    let incorrect = 0;

    for (const hp of r.homework_papers ?? []) {
      const sourceId = hp.pp_id ?? hp.worksheet_id;
      if (!sourceId) continue;
      for (const qid of questionsByPaper.get(sourceId) ?? []) {
        total++;
        const o = outcomeFor.get(qid);
        if (o === "correct") correct++;
        else if (o === "partial") partial++;
        else if (o === "incorrect") incorrect++;
      }
    }

    const marked = correct + partial + incorrect;
    // A homework is complete only when the student has ticked it - never
    // auto-completed from question progress.
    const complete = r.completed;

    let daysUntilDue: number | null = null;
    if (r.due_date) {
      const [y, m, d] = r.due_date.split("-").map(Number);
      daysUntilDue = Math.round((Date.UTC(y, m - 1, d) - todayUTC) / 86400000);
    }

    return {
      id: r.id,
      title: r.title,
      notes: r.notes,
      files: (r.homework_files ?? []).map((f) => ({ path: f.path, name: f.name })),
      completed: r.completed,
      assignedLabel: dateLabel(r.assigned_date),
      dueLabel: r.due_date ? dateLabel(r.due_date) : null,
      daysUntilDue,
      papers: (r.homework_papers ?? [])
        .filter((hp) => hp.pp_id || hp.worksheet_id)
        .map((hp) => {
          const ws = hp.worksheets;
          return {
            ppId: (hp.pp_id ?? hp.worksheet_id) as string,
            isWorksheet: !!hp.worksheet_id,
            label: hp.past_paper
              ? `${humanize(hp.past_paper.exam_board)} ${moduleLabel(hp.past_paper.module, hp.past_paper.gcse_alevel)} ${hp.past_paper.paper_year ?? ""}`.trim()
              : ws
                ? `${moduleLabel(ws.module, "A_LEVEL")} · ${ws.topic_name ?? "Worksheet"}`.trim()
                : "Unknown material",
            qpPath: hp.past_paper?.qp_path ?? ws?.qp_path ?? null,
            msPath: hp.past_paper?.ms_path ?? ws?.ms_path ?? null,
          };
        }),
      total,
      correct,
      partial,
      incorrect,
      marked,
      status: complete
        ? "complete"
        : marked > 0
          ? "in_progress"
          : "not_started",
      overdue: !complete && daysUntilDue !== null && daysUntilDue < 0,
    };
  });
}

/**
 * Student ticks their own homework as done (or un-ticks it). RLS ("Students
 * update own homework") scopes the update to the caller's own rows; the app
 * only ever writes the `completed` flag.
 */
export async function setHomeworkComplete(homeworkId: string, complete: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("homework")
    .update({ completed: complete })
    .eq("id", homeworkId);

  if (error) {
    console.error("setHomeworkComplete error:", error);
    return { error: error.message };
  }

  revalidatePath("/student/homework");
  return { error: null };
}

export async function deleteHomework(homeworkId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("homework")
    .delete()
    .eq("id", homeworkId);

  if (error) {
    console.error("deleteHomework error:", error);
    return { error: error.message };
  }

  revalidatePath(`/tutor/students/${studentId}`);
  revalidatePath("/student/homework");
  return { error: null };
}
