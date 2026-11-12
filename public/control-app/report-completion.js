export function completionProgress(planned,completed,previous=0) {
  const remaining = planned == null ? null : Math.max(planned-completed,0);
  if (completed < previous) return { state:'missing',mode:'',remaining };
  if (!Number.isInteger(completed) || completed<1) return { state:'empty',mode:'',remaining };
  if (planned == null) return { state:'unplanned',mode:'full',remaining };
  if (completed>planned) return { state:'excess',mode:'',remaining };
  if (remaining>0) return { state:'partial',mode:'partial',remaining };
  return { state:'full',mode:'full',remaining };
}
