/** A single course row as it exists in the knowledge base. */
export interface Course {
  course_name: string;
  course_link: string;
  description: string | null;
  price: number | null;
  starting_date: string | null; // ISO yyyy-mm-dd
  format: string | null; // 'Live' | 'Self-Paced'
  number_of_lessons: number | null;
  total_duration_hours: number | null;
  target_audience: string | null;
}

/** A retrieved course plus its similarity score (from match_courses). */
export interface RetrievedCourse extends Course {
  id: number;
  content: string;
  similarity: number;
}

/**
 * Build the canonical text representation of a course. This same text is used
 * both for embedding (ingestion) and as grounding context passed to the LLM,
 * so retrieval and generation see identical facts.
 */
export function courseToText(c: Course): string {
  const lines = [
    `Course Name: ${c.course_name}`,
    `Link: ${c.course_link}`,
    c.description ? `Description: ${c.description}` : null,
    c.price != null ? `Price: ${c.price}` : null,
    c.starting_date ? `Starting Date: ${c.starting_date}` : null,
    c.format ? `Format: ${c.format}` : null,
    c.number_of_lessons != null ? `Number of Lessons: ${c.number_of_lessons}` : null,
    c.total_duration_hours != null ? `Total Duration (Hours): ${c.total_duration_hours}` : null,
    c.target_audience ? `Target Audience: ${c.target_audience}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}
