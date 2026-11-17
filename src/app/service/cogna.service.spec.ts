import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CognaService } from './cogna.service';

describe('CognaService', () => {
  let service: CognaService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CognaService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(CognaService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should default the minimum search score to zero', () => {
    const params: { query: string; minScore?: number } = { query: 'example' };

    service.searchDb(12, params).subscribe();

    const request = httpTestingController.expectOne(
      `${service.baseApi}/cogna/12/search-db`
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('query')).toBe('example');
    expect(request.request.params.get('minScore')).toBe('0');
    expect(params.minScore).toBe(0);

    request.flush([]);
  });

  it('should preserve an explicitly supplied minimum search score', () => {
    service.searchDb(12, { query: 'example', minScore: 0.75 }).subscribe();

    const request = httpTestingController.expectOne(
      `${service.baseApi}/cogna/12/search-db`
    );
    expect(request.request.params.get('minScore')).toBe('0.75');

    request.flush([]);
  });
});
