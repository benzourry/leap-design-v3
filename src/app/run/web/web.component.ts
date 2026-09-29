import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal, HostListener } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router'; // <-- Added Router
import { map, withLatestFrom } from 'rxjs';
import { base } from '../../_shared/constant.service';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { RunService } from '../_service/run.service';

@Component({
  selector: 'app-web',
  templateUrl: './web.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./web.component.scss'],
  imports: [SafePipe]
})
export class WebComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router); // <-- Inject Router
  private http = inject(HttpClient);
  private titleService = inject(Title);
  public runService = inject(RunService);

  path = input<string>('', { alias: 'path' });
  html = signal<string>("");

  constructor() {}

  // Listen for messages from the iframe
  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent) {
    if (event.data && event.data.type === 'IFRAME_NAVIGATE') {
      const targetUrl = event.data.url;
      
      try {
        const urlObj = new URL(targetUrl);
        
        // If the link belongs to your application (same origin)
        if (urlObj.origin === window.location.origin) {
          // Extract the path from the hash (e.g., "#/screen/4749" -> "/screen/4749")
          const routePath = urlObj.hash.replace(/^#/, '');
          
          if (routePath) {
            // Navigate using Angular router for seamless SPA transition
            this.router.navigateByUrl(routePath);
          }
        } else {
          // If it's an external link (like google.com), open it in a new tab
          window.open(targetUrl, '_blank');
        }
      } catch (error) {
        console.error("Invalid URL clicked inside iframe", targetUrl);
      }
    }
  }

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
            // 1. Updated script: Handle both scroll anchors AND routing links
            const isolationScript = `
              <script>
                document.addEventListener('click', function(e) {
                  const anchor = e.target.closest('a');
                  if (anchor) {
                    const hrefAttr = anchor.getAttribute('href');
                    const fullUrl = anchor.href; // Resolves absolute URL
                    
                    if (hrefAttr) {
                      // Scenario A: Standard scroll anchor (e.g., href="#section1")
                      // We make sure it doesn't start with '#/' which is an Angular route
                      if (hrefAttr.startsWith('#') && !hrefAttr.startsWith('#/')) {
                        e.preventDefault(); 
                        const targetId = hrefAttr.substring(1);
                        const targetEl = document.getElementById(targetId);
                        
                        if (targetEl) {
                          targetEl.scrollIntoView({ behavior: 'smooth' });
                        }
                        return;
                      }

                      // Scenario B: Angular Route or External Link
                      e.preventDefault(); // Stop iframe from navigating
                      
                      // Send the URL to the parent Angular application
                      window.parent.postMessage({ 
                        type: 'IFRAME_NAVIGATE', 
                        url: fullUrl 
                      }, '*');
                    }
                  }
                });
              </script>
            `;

            // 2. Append the script
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