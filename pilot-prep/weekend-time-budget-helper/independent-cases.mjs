import assert from 'node:assert/strict';

// Fixed expectations independent of model-written tests. This is not a sandbox.
export function checkPlanTime(planTime) {
  let cases = 0;
  const check = (name, run) => { try { run(); cases++; } catch (error) { throw new Error(`Independent case failed: ${name}`, { cause: error }); } };
  const output = (args, expected) => {
    const actual = planTime(...args);
    assert.deepEqual(Object.keys(actual).sort(), ['totalMinutes','bufferMinutes','requiredMinutes','remainingMinutes','fits'].sort());
    for (const [key, value] of Object.entries(expected)) {
      if (typeof value === 'number') { assert.equal(typeof actual[key], 'number'); assert.ok(Number.isFinite(actual[key])); assert.ok(Math.abs(actual[key] - value) <= 1e-10); }
      else assert.equal(actual[key], value);
    }
  };
  for (const [name, args, expected] of [
    ['default buffer', [[30,45],2], {totalMinutes:75,bufferMinutes:0,requiredMinutes:75,remainingMinutes:45,fits:true}],
    ['explicit buffer off', [[30,45],2,false], {totalMinutes:75,bufferMinutes:0,requiredMinutes:75,remainingMinutes:45,fits:true}],
    ['20 percent buffer', [[30,45],2,true], {totalMinutes:75,bufferMinutes:15,requiredMinutes:90,remainingMinutes:30,fits:true}],
    ['exact capacity', [[60,60],2], {totalMinutes:120,bufferMinutes:0,requiredMinutes:120,remainingMinutes:0,fits:true}],
    ['over capacity', [[90,45],2], {totalMinutes:135,bufferMinutes:0,requiredMinutes:135,remainingMinutes:-15,fits:false}],
    ['empty zero', [[],0], {totalMinutes:0,bufferMinutes:0,requiredMinutes:0,remainingMinutes:0,fits:true}],
    ['zero duration', [[0],1,true], {totalMinutes:0,bufferMinutes:0,requiredMinutes:0,remainingMinutes:60,fits:true}],
    ['decimal tolerance', [[0.1,0.2],0.01], {totalMinutes:0.3,bufferMinutes:0,requiredMinutes:0.3,remainingMinutes:0.3,fits:true}],
    ['buffer exact fit', [[50],1,true], {totalMinutes:50,bufferMinutes:10,requiredMinutes:60,remainingMinutes:0,fits:true}],
    ['buffer causes shortfall', [[60],1,true], {totalMinutes:60,bufferMinutes:12,requiredMinutes:72,remainingMinutes:-12,fits:false}],
    ['no rounding', [[1.25],0.1,true], {totalMinutes:1.25,bufferMinutes:0.25,requiredMinutes:1.5,remainingMinutes:4.5,fits:true}]
  ]) check(name, () => output(args, expected));
  const invalid = [
    ['missing arguments', []], ['non-array', [3,1]], ['null list', [null,1]], ['text list', ['30',1]],
    ['negative duration', [[-1],1]], ['text duration', [['1'],1]], ['null duration', [[null],1]],
    ['undefined duration', [[undefined],1]], ['NaN duration', [[NaN],1]], ['infinite duration', [[Infinity],1]],
    ['negative infinite duration', [[-Infinity],1]], ['boolean duration', [[true],1]], ['sparse list', [Array(1),1]],
    ['missing hours', [[1]]], ['text hours', [[1],'1']], ['null hours', [[1],null]],
    ['negative hours', [[1],-1]], ['NaN hours', [[1],NaN]], ['infinite hours', [[1],Infinity]],
    ['boolean hours', [[1],true]], ['text buffer', [[1],1,'true']], ['null buffer', [[1],1,null]],
    ['numeric buffer', [[1],1,1]], ['sum overflow', [[Number.MAX_VALUE,Number.MAX_VALUE],1]],
    ['hours overflow', [[1],Number.MAX_VALUE]], ['buffer overflow', [[Number.MAX_VALUE],1,true]]
  ];
  for (const [name,args] of invalid) check(name, () => assert.throws(() => planTime(...args)));
  check('input unchanged and reusable', () => {
    const input = Object.freeze([30,45]);
    const first = planTime(input,2,true), second = planTime(input,2,true);
    assert.deepEqual(input,[30,45]); assert.deepEqual(first,second); assert.notEqual(first,second);
  });
  return { passed: cases, failed: 0, evidenceType: 'independent-behavior-cases' };
}
