import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  it('should start with loading disabled', () => {
    expect(service.isLoadingSignal()).toBeFalse();
  });

  it('should update the loading signal', () => {
    service.setLoading(true);
    expect(service.isLoadingSignal()).toBeTrue();

    service.setLoading(false);
    expect(service.isLoadingSignal()).toBeFalse();
  });
});
