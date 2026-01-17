import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // Debug logging
    console.log(`[RolesGuard] Checking authorization - User:`, JSON.stringify(user, null, 2));
    console.log(`[RolesGuard] Required Roles: ${JSON.stringify(requiredRoles)}`);

    if (!user) {
      console.log('[RolesGuard] No user found in request');
      return false;
    }

    const userRole = user.role;
    console.log(`[RolesGuard] User Role from token: '${userRole}' (type: ${typeof userRole})`);

    const hasRole = requiredRoles.some((role) => {
      const matches = userRole === role;
      console.log(`[RolesGuard] Comparing '${userRole}' === '${role}': ${matches}`);
      return matches;
    });
    
    if (!hasRole) {
      console.log(`[RolesGuard] ❌ FAIL: User role '${userRole}' not in required list ${JSON.stringify(requiredRoles)}`);
      console.log(`[RolesGuard] User object:`, JSON.stringify(user, null, 2));
    } else {
      console.log(`[RolesGuard] ✅ PASS: User role '${userRole}' authorized`);
    }
    return hasRole;
  }
}

