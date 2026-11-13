const templates=new WeakMap();

// Preserve image nodes and their pending private fetches across status heartbeats.
export function updatePhotoThumbnails(container,markup) {
  if (templates.get(container)===markup) return false;
  container.innerHTML=markup;
  templates.set(container,markup);
  return true;
}
