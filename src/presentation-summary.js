// Pure summary data shared by editable PPTX output and regression tests.
import {compareFlows} from './compare';
import {processMetrics} from './metrics';
import {graphDiagnostics} from './graph';

export function presentationSummary(project){
 const diff=compareFlows(project);
 const today=processMetrics(project.flows.today.steps);
 const tomorrow=processMetrics(project.flows.tomorrow.steps);
 const diagnostics={
  today:graphDiagnostics(project.flows.today.steps),
  tomorrow:graphDiagnostics(project.flows.tomorrow.steps)
 };
 const names=items=>items.map(item=>item.after?.name||item.name);
 const changes=[
  {title:'Added in TOMORROW',items:names(diff.added)},
  {title:'Removed from TODAY',items:names(diff.removed)},
  {title:'Reordered / different department',items:names(diff.moved)},
  {title:'Details updated',items:names(diff.updated)},
  {title:'Dependencies changed',items:names(diff.dependencyChanged)}
 ];
 const timedToday=project.flows.today.steps.some(s=>(Number(s.durationHours)||0)+(Number(s.waitHours)||0)>0);
 const timedTomorrow=project.flows.tomorrow.steps.some(s=>(Number(s.durationHours)||0)+(Number(s.waitHours)||0)>0);
 return {
  diff,changes,metrics:{today,tomorrow},diagnostics,
  timeComparable:timedToday&&timedTomorrow,
  timeDeltaHours:timedToday&&timedTomorrow?today.hours-tomorrow.hours:null,
  stepDelta:tomorrow.steps-today.steps,
  description:'Differences are based on step IDs and unique step names. Durations are indicative and are not resource-constrained.'
 };
}
