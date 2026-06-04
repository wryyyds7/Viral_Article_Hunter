// ABOUTME: Simple SPA router for page navigation
type RouteHandler = () => void;

interface Route {
  path: string;
  handler: RouteHandler;
}

class Router {
  private routes: Route[] = [];
  private currentPath: string = '';

  addRoute(path: string, handler: RouteHandler): Router {
    this.routes.push({ path, handler });
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

    const route = this.routes.find(r => r.path === path);
    if (route) {
      route.handler();
    } else {
      // Try fallback to /
      const fallback = this.routes.find(r => r.path === '/');
      if (fallback) fallback.handler();
    }

    // Update active nav
    document.querySelectorAll('[data-nav-link]').forEach(el => {
      const href = (el as HTMLAnchorElement).getAttribute('href')?.replace('#', '') || '';
      el.classList.toggle('nav-active', href === path);
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
