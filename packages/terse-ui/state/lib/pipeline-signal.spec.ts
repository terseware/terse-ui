import {Directive} from '@angular/core';
import {By} from '@angular/platform-browser';
import {render} from '@testing-library/angular';
import {describe, it} from 'vitest';
import {pipelineSignal} from './pipeline-signal';

describe('pipelineSignal', () => {
  @Directive({selector: '[dir]'})
  class Dir {
    readonly pipeline = pipelineSignal(1);
    constructor() {
      this.pipeline.pipe(({next}) => next(2));
      this.pipeline.pipe(({next}) => next(-1));
    }
  }
  it('should create a pipeline signal', async () => {
    const {fixture} = await render(`<div dir></div>`, {imports: [Dir]});
    const dir = fixture.debugElement.query(By.directive(Dir)).injector.get(Dir);
    expect(dir.pipeline()).toBe(-1);
  });
});
