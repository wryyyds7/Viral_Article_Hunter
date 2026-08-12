// ABOUTME: Simple SPA router for page navigation with dynamic route support
type RouteHandler = (params?: Record<string, string>) => void;

interface Route {
  pattern: string;
  handler: RouteHandler;
  regex: RegExp;
  paramNames: string[];
}

class Router {
  private routes: Route[] = [];
  private currentPath: string = '';

  addRoute(pattern: string, handler: RouteHandler): Router {
    // Convert /path/:id to regex
    const paramNames: string[] = [];
    const regexStr = pattern
      .replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      })
      .replace(/\//g, '\\/');

    this.routes.push({
      pattern,
      handler,
      regex: new RegExp(`^${regexStr}$`),
      paramNames,
    });
    return this;
  }

  navigate(path: string): void {
    this.currentPath = path;
    window.history.pushState({}, path, `#${path}`);
    this.resolve();
  }

  resolve(): void {
    const path = window.location.hash.slice(1) || '/';
    this.currentPath = path;

    // Try exact match first
    const exactRoute = this.routes.find(r => r.pattern === path);
    if (exactRoute) {
      exactRoute.handler();
      this.updateNav(path);
      return;
    }

    // Try pattern match
    for (const route of this.routes) {
      const match = path.match(route.regex);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        route.handler(params);
        this.updateNav(path);
        return;
      }
    }

    // Fallback to /
    const fallback = this.routes.find(r => r.pattern === '/');
    if (fallback) fallback.handler();
    this.updateNav(path);
  }

  private updateNav(path: string): void {
    document.querySelectorAll('[data-nav-link]').forEach(el => {
      const href = (el as HTMLElement).getAttribute('href')?.replace('#', '') || '';
      el.classList.toggle('nav-active', href === path || (href !== '/' && path.startsWith(href)));
    });
  }

  start(): void {
    window.addEventListener('popstate', () => this.resolve());
    this.resolve();
  }

  getCurrentPath(): string {
    return this.currentPath;
  }
}

export const router = new Router();
