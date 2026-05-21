function getAnnotationReviewSummary(annotations, masks) {
  const missingAnnotations = annotations.filter((annotation) => !String(annotation.note || '').trim());
  const missingNumbers = missingAnnotations.map((annotation) => annotation.number);

  return {
    annotationCount: annotations.length,
    maskCount: masks.length,
    missingCount: missingNumbers.length,
    missingNumbers,
    ready: missingNumbers.length === 0
  };
}
