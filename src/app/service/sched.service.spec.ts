import { TestBed } from '@angular/core/testing';

import { SchedService } from './sched.service';

describe('SchedService', () => {
  let service: SchedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SchedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
