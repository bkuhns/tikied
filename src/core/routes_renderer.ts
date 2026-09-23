import { Graphics } from 'pixi.js';

export interface Route {
    points: { x: number, y: number }[];
    color: string;
    visible: boolean;
    cachedSplinePts?: { x: number, y: number }[];
    cachedDistances?: number[];
    totalDistance?: number;
}

export class RoutesRenderer {
    private routes: Route[] = [];

    // Fixed list of colors as requested
    public static readonly COLORS = [
        "rgb(255, 0, 0)",    // Red
        "rgb(0, 255, 0)",    // Green
        "rgb(0, 127, 255)",  // Light Blue
        "rgb(255, 255, 0)",  // Yellow
        "rgb(255, 0, 255)",  // Magenta
        "rgb(0, 255, 255)",  // Cyan
        "rgb(255, 127, 0)",  // Orange
        "rgb(255, 255, 255)" // White
    ];

    public static getRouteColor(routeIndex: number): string {
        return RoutesRenderer.COLORS[routeIndex % RoutesRenderer.COLORS.length];
    }

    public parseRoadTxt(content: string) {
        this.routes = [];
        // The file looks like:
        // global RoadMap =
        // {{ vector(...), vector(...) }, { vector(...) }}
        
        // Find everything inside the main outer brackets
        const blocks = content.split('{');
        let colorIdx = 0;

        for (const block of blocks) {
            const regex = /vector\(([-0-9.]+),\s*([-0-9.]+)\)/g;
            let match;
            const points: {x: number, y: number}[] = [];
            
            while ((match = regex.exec(block)) !== null) {
                points.push({
                    x: parseFloat(match[1]),
                    y: parseFloat(match[2])
                });
            }

            if (points.length > 0) {
                this.routes.push({
                    points: points,
                    color: RoutesRenderer.getRouteColor(colorIdx),
                    visible: true
                });
                colorIdx++;
            }
        }
    }

    public getRoutes(): Route[] {
        return this.routes;
    }

    public setRoutes(routes: Route[]): void {
        this.routes = routes;
    }

    public clear() {
        this.routes = [];
    }

    private computeRouteDistances(route: Route) {
        if (!route.cachedSplinePts) return;
        const pts = route.cachedSplinePts;
        const dists: number[] = [0];
        let total = 0;
        for (let i = 0; i < pts.length - 1; i++) {
            const dx = pts[i+1].x - pts[i].x;
            const dy = pts[i+1].y - pts[i].y;
            total += Math.sqrt(dx * dx + dy * dy);
            dists.push(total);
        }
        route.cachedDistances = dists;
        route.totalDistance = total;
    }

    public getRouteLength(routeIndex: number): number {
        const route = this.routes[routeIndex];
        if (!route || route.points.length < 2) return 1.0;
        
        if (!route.cachedSplinePts || route.cachedDistances === undefined) {
            route.cachedSplinePts = this.computeNaturalCubicSpline(route.points, 20);
            this.computeRouteDistances(route);
        }
        
        return Math.max(0.1, route.totalDistance! / 50.0);
    }

    public getPointOnRoute(routeIndex: number, ratio: number): { x: number; y: number } | null {
        const route = this.routes[routeIndex];
        if (!route || route.points.length === 0) return null;
        if (route.points.length === 1) return { ...route.points[0] };

        if (!route.cachedSplinePts || route.cachedDistances === undefined) {
            route.cachedSplinePts = this.computeNaturalCubicSpline(route.points, 20);
            this.computeRouteDistances(route);
        }
        
        const pts = route.cachedSplinePts;
        const dists = route.cachedDistances!;
        const totalDist = route.totalDistance!;
        
        if (pts.length === 0) return null;

        const clampedRatio = Math.max(0, Math.min(1, ratio));
        const targetDist = clampedRatio * totalDist;
        
        for (let i = 0; i < dists.length - 1; i++) {
            if (targetDist >= dists[i] && targetDist <= dists[i+1]) {
                const segmentLen = dists[i+1] - dists[i];
                const frac = segmentLen > 0 ? (targetDist - dists[i]) / segmentLen : 0;
                return {
                    x: pts[i].x + (pts[i+1].x - pts[i].x) * frac,
                    y: pts[i].y + (pts[i+1].y - pts[i].y) * frac
                };
            }
        }

        return { ...pts[pts.length - 1] };
    }

    public draw(graphics: Graphics) {
        graphics.clear();
        for (const route of this.routes) {
            if (!route.visible || route.points.length === 0) continue;

            const pts = route.points;

            // Draw Spline
            if (pts.length > 1) {
                if (!route.cachedSplinePts) {
                    route.cachedSplinePts = this.computeNaturalCubicSpline(pts, 20);
                }
                const splinePts = route.cachedSplinePts;
                
                graphics.moveTo(splinePts[0].x, splinePts[0].y);
                for (let i = 1; i < splinePts.length; i++) {
                    graphics.lineTo(splinePts[i].x, splinePts[i].y);
                }
                graphics.stroke({ width: 4, color: route.color });
            }

            // Draw Control Points
            for (const pt of pts) {
                const r = 6;
                graphics.rect(pt.x - r, pt.y - r, r * 2, r * 2);
                graphics.fill({ color: route.color });
                graphics.stroke({ width: 1, color: 0x000000 });
            }
        }
    }

    // Solves for a Natural Cubic Spline with uniform parameterization (t = 0, 1, ... n-1)
    private computeNaturalCubicSpline(pts: {x: number, y: number}[], segmentsPerCurve: number = 20): {x: number, y: number}[] {
        const n = pts.length;
        if (n < 2) return [...pts];

        // We solve for x and y separately
        const xSpline = this.solveSpline1D(pts.map(p => p.x));
        const ySpline = this.solveSpline1D(pts.map(p => p.y));

        const result: {x: number, y: number}[] = [];
        
        for (let i = 0; i < n - 1; i++) {
            for (let j = 0; j < segmentsPerCurve; j++) {
                const t = j / segmentsPerCurve;
                result.push({
                    x: this.evalSplineSegment(xSpline, i, t),
                    y: this.evalSplineSegment(ySpline, i, t)
                });
            }
        }
        // Add the exact last point
        result.push(pts[n - 1]);
        
        return result;
    }

    // Natural cubic spline solver using Thomas Algorithm (Tridiagonal Matrix)
    private solveSpline1D(vals: number[]) {
        const n = vals.length;
        const a = new Float64Array(n);
        const b = new Float64Array(n);
        const c = new Float64Array(n);
        const d = new Float64Array(n);

        // Equations:
        // h_i = 1 (uniform spacing t)
        // a_i = vals[i]
        for (let i = 0; i < n; i++) a[i] = vals[i];

        const alpha = new Float64Array(n);
        for (let i = 1; i < n - 1; i++) {
            alpha[i] = 3 * (vals[i+1] - vals[i]) - 3 * (vals[i] - vals[i-1]);
        }

        const l = new Float64Array(n);
        const mu = new Float64Array(n);
        const z = new Float64Array(n);

        l[0] = 1;
        mu[0] = 0;
        z[0] = 0;

        for (let i = 1; i < n - 1; i++) {
            l[i] = 4 - mu[i-1];
            mu[i] = 1 / l[i];
            z[i] = (alpha[i] - z[i-1]) / l[i];
        }

        l[n-1] = 1;
        z[n-1] = 0;
        c[n-1] = 0;

        for (let j = n - 2; j >= 0; j--) {
            c[j] = z[j] - mu[j] * c[j+1];
            b[j] = vals[j+1] - vals[j] - (c[j+1] + 2 * c[j]) / 3;
            d[j] = (c[j+1] - c[j]) / 3;
        }

        return { a, b, c, d };
    }

    private evalSplineSegment(coeffs: {a: Float64Array, b: Float64Array, c: Float64Array, d: Float64Array}, i: number, t: number): number {
        return coeffs.a[i] + coeffs.b[i] * t + coeffs.c[i] * t * t + coeffs.d[i] * t * t * t;
    }
}