"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/server";
import { WORKSHEET_BOARD } from "@/lib/programme";
import {
  humanize,
  specLabel,
  moduleLabel,
} from "@/components/students/materials/types";

/**
 * Junction rows (lesson_papers / homework_papers) store exactly one of
 * pp_id / worksheet_id, so before inserting we need to know which column each
 * selected id belongs in. Ask the worksheets table which of the ids are
 * worksheets; the rest are past papers.
 */
async function splitSources(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<{ paperIds: string[]; worksheetIds: string[] }> {
  if (ids.length === 0) return { paperIds: [], worksheetIds: [] };
  const { data, error } = await supabase
    .from("worksheets")
    .select("id")
    .in("id", ids);
  if (error) console.error("splitSources error:", error);
  const worksheetIds = new Set((data ?? []).map((w) => w.id));
  return {
    paperIds: ids.filter((id) => !worksheetIds.has(id)),
    worksheetIds: ids.filter((id) => worksheetIds.has(id)),
  };
}

export type LessonTopicEntry = {
  topicId: string;
  topic: string;
  minutes: number | null;
};

export type LessonPaperEntry = {
  ppId: string;
  label: string;
  qpPath: string | null;
  msPath: string | null;
};

export type HomeworkFile = { path: string; name: string };

export type LessonHomework = {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
  paperIds: string[];
  /** Tutor-uploaded custom PDFs stored in the homework-pdfs bucket. */
  files: HomeworkFile[];
};

export type Lesson = {
  id: string;
  date: string;
  dateLabel: string;
  /** Whole days between the lesson date and now, computed server-side so the
   *  client can derive "2w ago" style labels without a hydration mismatch. */
  daysAgo: number;
  monthKey: string;
  durationMinutes: number | null;
  notes: string | null;
  topics: LessonTopicEntry[];
  papers: LessonPaperEntry[];
  homework: LessonHomework | null;
};

export type TopicOption = {
  id: string;
  topic: string;
  section: string;
  /** "A_LEVEL" | "GCSE" - the top-level grouping in the topic picker. */
  qual: string;
};

export type PaperOption = {
  id: string;
  label: string;
  /** "A Level" | "GCSE" - the top-level filter in the picker. */
  qual: string;
  board: string;
  module: string;
  year: string;
  spec: string;
};

function dateLabel(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  });
}

export async function getLessonOptions(): Promise<{
  topics: TopicOption[];
  papers: PaperOption[];
}> {
  const supabase = await createClient();

  const [topicsRes, papersRes, worksheetsRes] = await Promise.all([
    supabase.from("topics").select("id, topic, section_course, gcse_alevel"),
    supabase
      .from("past_paper")
      .select("id, gcse_alevel, exam_board, module:paper_module, paper_year, spec_level")
      .order("paper_year", { ascending: false }),
    supabase
      .from("worksheets")
      .select("id, module, topic_name")
      .order("module")
      .order("topic_name"),
  ]);

  if (topicsRes.error)
    console.error("getLessonOptions topics:", topicsRes.error);
  if (papersRes.error)
    console.error("getLessonOptions papers:", papersRes.error);
  if (worksheetsRes.error)
    console.error("getLessonOptions worksheets:", worksheetsRes.error);

  const topics: TopicOption[] = (topicsRes.data ?? [])
    .map((t) => ({
      id: t.id,
      topic: t.topic ?? "",
      section: t.section_course ?? "Other",
      qual: t.gcse_alevel ?? "",
    }))
    // A Level first, then GCSE, then by section, then topic.
    .sort(
      (a, b) =>
        (a.qual === "A_LEVEL" ? 0 : 1) - (b.qual === "A_LEVEL" ? 0 : 1) ||
        a.section.localeCompare(b.section) ||
        a.topic.localeCompare(b.topic),
    );

  const papers: PaperOption[] = (papersRes.data ?? []).map((p) => {
    const board = humanize(p.exam_board);
    const moduleText = moduleLabel(p.module, p.gcse_alevel);
    const year = p.paper_year ?? "";
    const spec = specLabel(p.spec_level);
    return {
      id: p.id,
      qual: humanize(p.gcse_alevel),
      board,
      module: moduleText,
      year,
      spec,
      label: `${board} ${moduleText} ${year}`.trim(),
    };
  });

  // Worksheets slot into the same picker under A Level → Worksheets → Worksheets
  // → module, with the worksheet's topic at the leaf where a paper's year sits.
  const worksheets: PaperOption[] = (worksheetsRes.data ?? []).map((w) => {
    const moduleText = moduleLabel(w.module, "A_LEVEL");
    const topic = w.topic_name ?? "Worksheet";
    return {
      id: w.id,
      qual: "A Level",
      board: WORKSHEET_BOARD,
      module: moduleText,
      year: topic,
      spec: WORKSHEET_BOARD,
      label: `${moduleText} · ${topic}`.trim(),
    };
  });

  return { topics, papers: [...papers, ...worksheets] };
}

export async function getLessons(studentId: string): Promise<Lesson[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lessons")
    .select(
      `id,
       date,
       duration_minutes,
       notes,
       lesson_topics ( topic_id, minutes, topics ( topic ) ),
       lesson_papers ( pp_id, worksheet_id, past_paper ( gcse_alevel, exam_board, module:paper_module, paper_year, qp_path, ms_path ), worksheets ( module, topic_name, qp_path, ms_path ) ),
       homework ( id, title, notes, due_date, homework_papers ( pp_id, worksheet_id ), homework_files ( path, name ) )`,
    )
    .eq("student_id", studentId)
    .order("date", { ascending: false });

  if (error) {
    console.error("getLessons error:", error);
    return [];
  }

  type Row = {
    id: string;
    date: string;
    duration_minutes: number | null;
    notes: string | null;
    lesson_topics: {
      topic_id: string;
      minutes: number | null;
      topics: { topic: string | null } | null;
    }[];
    lesson_papers: {
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
    homework: {
      id: string;
      title: string;
      notes: string | null;
      due_date: string | null;
      homework_papers: { pp_id: string | null; worksheet_id: string | null }[];
      homework_files: { path: string; name: string }[];
    }[];
  };

  const today = new Date();
  const todayUTC = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  return ((data ?? []) as unknown as Row[]).map((l) => {
    const [y, m, d] = l.date.split("-").map(Number);
    const lessonUTC = Date.UTC(y, m - 1, d);

    return {
      id: l.id,
      date: l.date,
      dateLabel: dateLabel(l.date),
      daysAgo: Math.round((todayUTC - lessonUTC) / 86400000),
      monthKey: l.date.slice(0, 7),
      durationMinutes: l.duration_minutes,
      notes: l.notes,
      topics: (l.lesson_topics ?? [])
        .map((lt) => ({
          topicId: lt.topic_id,
          topic: lt.topics?.topic ?? "Unknown topic",
          minutes: lt.minutes,
        }))
        .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0)),
      papers: (l.lesson_papers ?? [])
        .filter((lp) => lp.pp_id || lp.worksheet_id)
        .map((lp) => {
          const ws = lp.worksheets;
          return {
            ppId: (lp.pp_id ?? lp.worksheet_id) as string,
            label: lp.past_paper
              ? `${humanize(lp.past_paper.exam_board)} ${moduleLabel(lp.past_paper.module, lp.past_paper.gcse_alevel)} ${lp.past_paper.paper_year ?? ""}`.trim()
              : ws
                ? `${moduleLabel(ws.module, "A_LEVEL")} · ${ws.topic_name ?? "Worksheet"}`.trim()
                : "Unknown material",
            qpPath: lp.past_paper?.qp_path ?? ws?.qp_path ?? null,
            msPath: lp.past_paper?.ms_path ?? ws?.ms_path ?? null,
          };
        }),
      // one homework per lesson in practice; take the first if there are more
      homework: l.homework?.[0]
        ? {
            id: l.homework[0].id,
            title: l.homework[0].title,
            notes: l.homework[0].notes,
            dueDate: l.homework[0].due_date,
            paperIds: (l.homework[0].homework_papers ?? [])
              .map((p) => p.pp_id ?? p.worksheet_id)
              .filter((id): id is string => !!id),
            files: (l.homework[0].homework_files ?? []).map((f) => ({
              path: f.path,
              name: f.name,
            })),
          }
        : null,
    };
  });
}

export type CreateLessonInput = {
  studentId: string;
  date: string;
  durationMinutes: number | null;
  notes: string;
  topics: { topicId: string; minutes: number | null }[];
  paperIds: string[];
  /** Optional homework set at the end of the lesson. */
  homework?: {
    title: string;
    notes: string;
    dueDate: string | null;
    paperIds: string[];
    /** Custom PDFs already uploaded to the homework-pdfs bucket. */
    files: HomeworkFile[];
  } | null;
};

/**
 * NOTE: three sequential inserts, not a transaction. If a child insert fails
 * the lesson row is deleted again below. Move into a Postgres function if you
 * ever need this to be properly atomic.
 */
export async function createLesson(input: CreateLessonInput) {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const tutorId = claims?.claims?.sub;
  if (!tutorId) return { error: "Not signed in" };

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .insert({
      tutor_id: tutorId,
      student_id: input.studentId,
      date: input.date,
      duration_minutes: input.durationMinutes,
      notes: input.notes.trim() || null,
    })
    .select("id")
    .single();

  if (lessonError || !lesson) {
    console.error("createLesson error:", lessonError);
    return { error: lessonError?.message ?? "Could not save lesson" };
  }

  if (input.topics.length > 0) {
    const { error } = await supabase.from("lesson_topics").insert(
      input.topics.map((t) => ({
        lesson_id: lesson.id,
        topic_id: t.topicId,
        minutes: t.minutes,
      })),
    );
    if (error) {
      await supabase.from("lessons").delete().eq("id", lesson.id);
      console.error("createLesson topics error:", error);
      return { error: error.message };
    }
  }

  if (input.paperIds.length > 0) {
    const { paperIds, worksheetIds } = await splitSources(supabase, input.paperIds);
    const { error } = await supabase.from("lesson_papers").insert([
      ...paperIds.map((pp_id) => ({ lesson_id: lesson.id, pp_id })),
      ...worksheetIds.map((worksheet_id) => ({ lesson_id: lesson.id, worksheet_id })),
    ]);
    if (error) {
      await supabase.from("lessons").delete().eq("id", lesson.id);
      console.error("createLesson papers error:", error);
      return { error: error.message };
    }
  }

  if (input.homework && input.homework.title.trim()) {
    const { data: hw, error: hwError } = await supabase
      .from("homework")
      .insert({
        lesson_id: lesson.id,
        tutor_id: tutorId,
        student_id: input.studentId,
        title: input.homework.title.trim(),
        notes: input.homework.notes.trim() || null,
        assigned_date: input.date,
        due_date: input.homework.dueDate,
      })
      .select("id")
      .single();

    if (hwError || !hw) {
      await supabase.from("lessons").delete().eq("id", lesson.id);
      console.error("createLesson homework error:", hwError);
      return { error: hwError?.message ?? "Could not save homework" };
    }

    if (input.homework.paperIds.length > 0) {
      const { paperIds, worksheetIds } = await splitSources(
        supabase,
        input.homework.paperIds,
      );
      const { error } = await supabase.from("homework_papers").insert([
        ...paperIds.map((pp_id) => ({ homework_id: hw.id, pp_id })),
        ...worksheetIds.map((worksheet_id) => ({ homework_id: hw.id, worksheet_id })),
      ]);
      if (error) {
        await supabase.from("homework").delete().eq("id", hw.id);
        await supabase.from("lessons").delete().eq("id", lesson.id);
        console.error("createLesson homework papers error:", error);
        return { error: error.message };
      }
    }
    if (input.homework.files.length > 0) {
      const { error } = await supabase.from("homework_files").insert(
        input.homework.files.map((f) => ({
          homework_id: hw.id,
          path: f.path,
          name: f.name,
        })),
      );
      if (error) {
        await supabase.from("homework").delete().eq("id", hw.id);
        await supabase.from("lessons").delete().eq("id", lesson.id);
        console.error("createLesson homework files error:", error);
        return { error: error.message };
      }
    }
    revalidatePath("/student/homework");
  }

  revalidatePath(`/tutor/students/${input.studentId}`);
  revalidatePath("/student/lessons");
  return { error: null };
}

export type UpdateLessonInput = CreateLessonInput & { lessonId: string };

/**
 * Edit a logged lesson. Topics and papers are replaced wholesale (delete then
 * insert) rather than diffed - simpler, and the row counts are tiny.
 *
 * Homework is upserted: passing one creates or updates it, passing null
 * removes any attached to this lesson.
 *
 * Like createLesson this is not a transaction. A mid-way failure can leave the
 * lesson updated but its topics/papers half-written; the error is returned so
 * the tutor can retry, and a retry is idempotent.
 */
export async function updateLesson(input: UpdateLessonInput) {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const tutorId = claims?.claims?.sub;
  if (!tutorId) return { error: "Not signed in" };

  const { error: lessonError } = await supabase
    .from("lessons")
    .update({
      date: input.date,
      duration_minutes: input.durationMinutes,
      notes: input.notes.trim() || null,
    })
    .eq("id", input.lessonId);

  if (lessonError) {
    console.error("updateLesson error:", lessonError);
    return { error: lessonError.message };
  }

  // replace topics
  await supabase.from("lesson_topics").delete().eq("lesson_id", input.lessonId);
  if (input.topics.length > 0) {
    const { error } = await supabase.from("lesson_topics").insert(
      input.topics.map((t) => ({
        lesson_id: input.lessonId,
        topic_id: t.topicId,
        minutes: t.minutes,
      })),
    );
    if (error) {
      console.error("updateLesson topics error:", error);
      return { error: error.message };
    }
  }

  // replace papers
  await supabase.from("lesson_papers").delete().eq("lesson_id", input.lessonId);
  if (input.paperIds.length > 0) {
    const { paperIds, worksheetIds } = await splitSources(supabase, input.paperIds);
    const { error } = await supabase.from("lesson_papers").insert([
      ...paperIds.map((pp_id) => ({ lesson_id: input.lessonId, pp_id })),
      ...worksheetIds.map((worksheet_id) => ({ lesson_id: input.lessonId, worksheet_id })),
    ]);
    if (error) {
      console.error("updateLesson papers error:", error);
      return { error: error.message };
    }
  }

  // upsert homework
  const { data: existing } = await supabase
    .from("homework")
    .select("id")
    .eq("lesson_id", input.lessonId)
    .maybeSingle();

  const hw = input.homework;

  if (hw && hw.title.trim()) {
    let homeworkId = existing?.id;

    if (homeworkId) {
      const { error } = await supabase
        .from("homework")
        .update({
          title: hw.title.trim(),
          notes: hw.notes.trim() || null,
          due_date: hw.dueDate,
        })
        .eq("id", homeworkId);
      if (error) {
        console.error("updateLesson homework error:", error);
        return { error: error.message };
      }
    } else {
      const { data: created, error } = await supabase
        .from("homework")
        .insert({
          lesson_id: input.lessonId,
          tutor_id: tutorId,
          student_id: input.studentId,
          title: hw.title.trim(),
          notes: hw.notes.trim() || null,
          assigned_date: input.date,
          due_date: hw.dueDate,
        })
        .select("id")
        .single();
      if (error || !created) {
        console.error("updateLesson homework insert error:", error);
        return { error: error?.message ?? "Could not save homework" };
      }
      homeworkId = created.id;
    }

    await supabase
      .from("homework_papers")
      .delete()
      .eq("homework_id", homeworkId);
    if (hw.paperIds.length > 0) {
      const { paperIds, worksheetIds } = await splitSources(supabase, hw.paperIds);
      const { error } = await supabase.from("homework_papers").insert([
        ...paperIds.map((pp_id) => ({ homework_id: homeworkId, pp_id })),
        ...worksheetIds.map((worksheet_id) => ({ homework_id: homeworkId, worksheet_id })),
      ]);
      if (error) {
        console.error("updateLesson homework papers error:", error);
        return { error: error.message };
      }
    }

    // Custom PDFs are replaced wholesale, same as papers. The storage objects
    // themselves are left in the bucket (harmless orphans if a file is dropped).
    await supabase
      .from("homework_files")
      .delete()
      .eq("homework_id", homeworkId);
    if (hw.files.length > 0) {
      const { error } = await supabase.from("homework_files").insert(
        hw.files.map((f) => ({ homework_id: homeworkId, path: f.path, name: f.name })),
      );
      if (error) {
        console.error("updateLesson homework files error:", error);
        return { error: error.message };
      }
    }
  } else if (existing) {
    await supabase.from("homework").delete().eq("id", existing.id);
  }

  revalidatePath(`/tutor/students/${input.studentId}`);
  revalidatePath("/student/lessons");
  revalidatePath("/student/homework");
  return { error: null };
}

export async function deleteLesson(lessonId: string, studentId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);

  if (error) {
    console.error("deleteLesson error:", error);
    return { error: error.message };
  }

  revalidatePath(`/tutor/students/${studentId}`);
  revalidatePath("/student/lessons");
  return { error: null };
}
