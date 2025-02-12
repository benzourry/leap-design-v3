import { TestBed } from '@angular/core/testing';

import { MailerService } from './mailer.service';

describe('MailerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MailerService = TestBed.get(MailerService);
    expect(service).toBeTruthy();
  });
});
