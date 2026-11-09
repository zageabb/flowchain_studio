import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Process analysis supports minimising estimates and diagnostics',()=>{
 const code=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(code,/\[analysisCollapsed,setAnalysisCollapsed\]=useState\(false\)/);
 assert.match(code,/aria-controls="process-analysis-content"/);
 assert.match(code,/aria-expanded=\{!analysisCollapsed\}/);
 assert.match(code,/setAnalysisCollapsed\(value=>!value\)/);
 assert.match(code,/analysisCollapsed\?"Expand ▾":"Minimise ▴"/);
 assert.match(code,/\{!analysisCollapsed&&<div id="process-analysis-content">/);
});
