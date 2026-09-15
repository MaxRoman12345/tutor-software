"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/server";

export type TopicAssessment = {
  rank: number | null;
  note: string | null;
};

/**
 * The tutor's manual strength assessments for one student, keyed by topic id.
 * Relies on RLS to enforce the caller is a tutor assigned to this student.
 */
export async function getTopicAssessments(
  studentId: string,
): Promise<Record<string, TopicAssessment>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_topic_assessments")
    .select("topic_id, rank, note")
    .eq("student_id", studentId);

  if (error) {
    console.error("getTopicAssessments error:", error);
    return {};
  }

  const byTopic: Record<string, TopicAssessment> = {};
  for (const row of data ?? []) {
    byTopic[row.topic_id] = { rank: row.rank, note: row.note };
  }
  return byTopic;
}

/** Create or update the assessment for one (student, topic). */
export async function setTopicAssessment(
  studentId: string,
  topicId: string,
  assessment: TopicAssessment,
) {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const tutorId = claims?.claims?.sub;
  if (!tutorId) return { error: "Not signed in" };

  const { error } = await supabase.from("student_topic_assessments").upsert(
    {
      student_id: studentId,
      topic_id: topicId,
      tutor_id: tutorId,
      rank: assessment.rank,
      note: assessment.note?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,topic_id" },
  );

  if (error) {
    console.error("setTopicAssessment error:", error);
    return { error: error.message };
  }

  revalidatePath(`/tutor/students/${studentId}`);
  revalidatePath("/student/dashboard");
  return { error: null };
}
