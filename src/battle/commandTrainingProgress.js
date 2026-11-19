export const COMMAND_TRAINING_KEY = 'titans-of-war:command-training:v1';
let sessionLessonId = null;

export function readTrainingLesson(lessons, storage) {
  try {
    const id = (!storage && sessionLessonId) || (storage ?? window.localStorage).getItem(COMMAND_TRAINING_KEY);
    return Math.max(0, lessons.findIndex(lesson => lesson.id === id));
  } catch {
    return 0;
  }
}

export function saveTrainingLesson(lesson, storage) {
  if (!storage) sessionLessonId = lesson.id;
  try {
    (storage ?? window.localStorage).setItem(COMMAND_TRAINING_KEY, lesson.id);
  } catch {
    // The lesson still works when local storage is unavailable.
  }
}
