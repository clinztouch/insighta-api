import { Strategy } from "passport-jwt";
import { AuthService } from "./auth.service";
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(payload: {
        sub: string;
        role: string;
    }): Promise<{
        created_at: Date;
        id: string;
        github_id: string;
        username: string;
        email: string | null;
        avatar_url: string | null;
        role: string;
        is_active: boolean;
        last_login_at: Date | null;
    }>;
}
export {};
