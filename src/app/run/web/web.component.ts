import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { map, withLatestFrom } from 'rxjs';
import { base } from '../../_shared/constant.service';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { RunService } from '../_service/run.service';

@Component({
  selector: 'app-web',
  templateUrl: './web.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./web.component.scss'],
  // MorphHtmlDirective is no longer needed
  imports: [SafePipe]
})
export class WebComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private titleService = inject(Title);
  public runService = inject(RunService);

  path = input<string>('', { alias: 'path' });
  html = signal<string>("");

  constructor() {}

  ngOnInit(): void {
    this.titleService.setTitle(this.path());

    this.route.url.pipe(
      withLatestFrom(this.route.params, this.route.queryParams)
    ).subscribe(([url, params, queryParams]) => {
      
      const currentPath = params['path'] || this.path();

      this.http.get(`${base}/~/${currentPath}/info`).subscribe((res: any) => {
        if (res && res.name) {
          this.titleService.setTitle(res.name);
        }
      });

      this.http.get(`${base}/~/${currentPath}/stream`, { 
        params: queryParams, 
        responseType: 'text', 
        observe: 'events', 
        reportProgress: true 
      })
      .pipe(
        map((res: any) => {
          if (res.type === 4) { 
            // 1. Create a script to hijack anchor clicks inside the iframe
            const isolationScript = `
              <script>
                document.addEventListener('click', function(e) {
                  const anchor = e.target.closest('a');
                  if (anchor) {
                    const href = anchor.getAttribute('href');
                    
                    // Check if the link is an internal anchor (starts with #)
                    if (href && href.startsWith('#')) {
                      e.preventDefault(); // STOP the URL hash from changing
                      
                      // Manually scroll to the target element
                      const targetId = href.substring(1);
                      const targetEl = document.getElementById(targetId);
                      
                      if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                      }
                    }
                  }
                });
              </script>
            `;

            // 2. Append the script to the end of the loaded HTML body
            this.html.set(res.body + isolationScript);
          }              
        })
      )
      .subscribe({
        error: err => {
          console.error("Failed to load page", err);
        }
      });
    });
  }
}