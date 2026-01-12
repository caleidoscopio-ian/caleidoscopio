# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Caleidoscópio Educacional** is a therapeutic and educational platform for TEA (Autism Spectrum Disorder) support. This is the educational module (Sistema 2) that integrates with a management system (Sistema 1) via SSO authentication.

### Key Technologies

- **Next.js 15.4.1** with App Router(React Server Components)
- **TypeScript** with strict configuration
- **Prisma** with PostgreSQL database
- **Tailwind CSS** with shadcn/ui components
- **Multi-tenant architecture** with tenant isolation
- \*\*Lucide React for icons
- \*\*React Hook Form with Zod validation

### Git Workflow

Branch strategy: main (production) ← develop ← feature branches
Branch naming: feature/EDU-XXX-description or fix/EDU-XXX-bug-name
Commit format: Conventional commits without AI mentions

✅ feat: add activity progress tracking
✅ fix: correct tenant isolation in patient queries
❌ feat: Claude added activity tracking

PR rules: Never push directly to main or develop
Commit atomicity: One logical change per commit
Never commit .env files or database dumps

## Development Commands

```bash
# Development server
npm run dev

# Build for production (includes type checking and linting)
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Build verification

**ALWAYS run `npm run build` before committing** to ensure:
- No TypeScript errors
- No ESLint errors (not just warnings)
- All types are correctly defined
- No missing imports or unused variables

The build process includes:
1. TypeScript compilation with strict mode
2. ESLint validation with `@typescript-eslint` rules
3. Next.js optimization and bundling

**If build fails, fix ALL errors before committing.** Warnings can be addressed later, but errors must be resolved.

## Architecture & Multi-Tenancy

### Database Schema (`prisma/schema.prisma`)

- **Multi-tenant design**: All tenant-specific models include `tenantId` field
- **Public models**: `Tenant`, `Usuario`, `ConfiguracaoGlobal`
- **Tenant-isolated models**: `Paciente`, `Profissional`, `Agendamento`, `Prontuario`
- **Educational models**: `Trilha`, `Atividade`, `TrilhaAluno`, `ProgressoAtividade`

### SSO Authentication Flow

The system implements SSO integration with Sistema 1 (Manager):

1. **Login**: User authenticates via `managerClient.ssoLogin()`
2. **Token Generation**: Sistema 1 validates access and generates SSO token
3. **Validation**: Periodic token validation every 5 minutes
4. **Storage**: User data and tokens stored in localStorage
5. Protected Routes: Wrap all authenticated pages with <ProtectedRoute>
6. Auth Context: Use useAuth() hook for user/tenant data access
7. 401 Handling: Auto-logout on authentication errors

Key files:

- `src/lib/manager-client.ts`: SSO client implementation
- `src/hooks/useAuth.tsx`: Authentication context and state management
- `src/components/ProtectedRoute.tsx`: Route protection component

useAuth Hook Returns
typescriptinterface AuthContext {
user: Usuario | null; // Current authenticated user
tenant: Tenant | null; // Current tenant/clinic
isAuthenticated: boolean; // Auth status
isAdmin: boolean; // Admin role check
config: TenantConfig; // Tenant-specific settings
login: (data) => Promise<void>;
logout: () => void;
}

### Component Architecture

- **UI Components**: Located in `src/components/ui/` using shadcn/ui
- **Layout Components**: `main-layout.tsx`, `app-sidebar.tsx` for main application structure
- **Form Components**: `src/components/forms/` for specific form implementations

### Code Conventions

- **Import aliases** configured in `components.json`:
  - `@/components` for components
  - `@/lib` for utilities
  - `@/hooks` for custom hooks
  - `@/types` for TypeScript types
- **UI Library**: Uses Lucide React icons
- **Styling**: Tailwind CSS with New York style from shadcn/ui

## Important Implementation Notes

### Multi-Tenant Data Access

Always include tenant isolation in database queries. Most models require `tenantId` filtering to ensure data isolation between clinics.

### Authentication State

Use the `useAuth` hook to access:

- `user`: Current authenticated user data
- `tenant`: Current tenant/clinic information
- `isAuthenticated`: Authentication status
- `isAdmin`: Admin role check
- `config`: Tenant-specific configuration

### Route Protection

Wrap protected pages with `<ProtectedRoute>` component which handles authentication checks and redirects.

### API Integration

- External API calls use `src/lib/api.ts` utilities with automatic auth headers
- SSO integration via `managerClient` singleton instance
- All API responses should handle authentication errors (401) with automatic logout

## Environment Variables

- `NEXT_PUBLIC_MANAGER_API_URL`: URL for Sistema 1 (Manager) API integration
- `DATABASE_URL`: PostgreSQL connection string for Prisma

## Database Operations

- Use `npx prisma generate` to update Prisma client after schema changes
- Use `npx prisma db push` for development database updates
- Use `npx prisma migrate dev` for production-ready migrations

## TypeScript Best Practices

### Avoid using `any` type

The project has strict TypeScript configuration with `@typescript-eslint/no-explicit-any` enabled. **NEVER use `any` type**.

#### ✅ Correct approach for Prisma queries:

Prisma generates multiple type definitions for each model. **Always use the appropriate Prisma-generated type** instead of `any`:

```typescript
import { Prisma } from '@prisma/client';

// WHERE clauses - use ModelWhereInput
const whereClause: Prisma.SessaoCurriculumWhereInput = {};
const patientFilter: Prisma.PacienteWhereInput = {};

// SELECT clauses - use ModelSelect
const selectFields: Prisma.AtividadeSelect = {
  id: true,
  nome: true,
  instrucoes: true,
};

// INCLUDE clauses - use ModelInclude
const includeRelations: Prisma.SessaoCurriculumInclude = {
  paciente: true,
  curriculum: true,
  avaliacoes: true,
};

// CREATE/UPDATE data - use ModelCreateInput or ModelUpdateInput
const createData: Prisma.SessaoCurriculumCreateInput = {
  status: 'EM_ANDAMENTO',
  paciente: { connect: { id: pacienteId } },
  curriculum: { connect: { id: curriculumId } },
};

const updateData: Prisma.SessaoCurriculumUpdateInput = {
  status: 'FINALIZADA',
  finalizada_em: new Date(),
};

// ORDER BY - use ModelOrderByWithRelationInput
const orderBy: Prisma.SessaoCurriculumOrderByWithRelationInput = {
  iniciada_em: 'desc',
};
```

**Common Prisma type patterns:**
- `Model` + `WhereInput` → Filtering (WHERE clauses)
- `Model` + `Select` → Field selection (SELECT)
- `Model` + `Include` → Relation inclusion (JOIN)
- `Model` + `CreateInput` → Creating records
- `Model` + `UpdateInput` → Updating records
- `Model` + `OrderByWithRelationInput` → Sorting
- `Model` + `WhereUniqueInput` → Finding by unique fields

**How to find the right type:**
1. Type `Prisma.` in your IDE
2. Start typing your model name (e.g., `SessaoCurriculum`)
3. IDE autocomplete will show all available types
4. Choose the one that matches your use case

#### ✅ Correct approach for enum validation:

When receiving enum values from query parameters (string type), always validate before assigning:

```typescript
// Get status from query params (string type)
const status = searchParams.get('status');

// Validate before using (avoid TypeScript errors)
if (status && ['EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA'].includes(status)) {
  whereClause.status = status as StatusSessao;
}
```

**Why this pattern?**
- Query params are always strings
- Prisma expects specific enum types
- Validation prevents invalid values from breaking the database query
- Type assertion is safe after validation

#### ❌ Wrong approaches:

```typescript
// ❌ NEVER do this
const whereClause: any = {};

// ❌ NEVER skip validation
whereClause.status = status; // TypeScript error!

// ❌ NEVER use blind type assertion without validation
whereClause.status = status as StatusSessao; // Unsafe!
```

### Interface definitions

Always define interfaces for component props and data structures. Remove fields that don't exist in the database schema:

```typescript
// ✅ Correct - only existing fields
interface Atividade {
  id: string;
  nome: string;
  instrucoes: Instrucao[];
}

// ❌ Wrong - includes non-existent field
interface Atividade {
  id: string;
  nome: string;
  tipo: string; // This field was removed from schema
}
```

### Type-safe alternatives to `any`

If the exact type is unknown, use these alternatives **in order of preference**:

1. **Use Prisma-generated types** (BEST):
   - For queries: `Prisma.ModelWhereInput`, `Prisma.ModelSelect`, `Prisma.ModelInclude`
   - For mutations: `Prisma.ModelCreateInput`, `Prisma.ModelUpdateInput`
   - For sorting: `Prisma.ModelOrderByWithRelationInput`
   - For unique queries: `Prisma.ModelWhereUniqueInput`

2. **Create specific interfaces** (RECOMMENDED):
   ```typescript
   interface SessaoResponse {
     id: string;
     status: StatusSessao;
     paciente: {
       nome: string;
     };
   }
   ```

3. **Use `Record<string, unknown>`** (ACCEPTABLE):
   ```typescript
   // For generic key-value objects
   const config: Record<string, unknown> = {};
   ```

4. **Use `unknown`** (LAST RESORT):
   ```typescript
   // Requires type guards before using
   const data: unknown = await response.json();
   if (isValidData(data)) {
     // Now safe to use
   }
   ```

**Never use `any` - it defeats the purpose of TypeScript!**

### Common enum types in this project

```typescript
// Session status
type StatusSessao = 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA';

// Always validate enums from external sources:
const validStatuses: StatusSessao[] = ['EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA'];
if (validStatuses.includes(value as StatusSessao)) {
  // Safe to use
}
```

Performance Requirements

LCP < 2.5s (Largest Contentful Paint)
FID < 100ms (First Input Delay)
CLS < 0.1 (Cumulative Layout Shift)
Bundle size < 300KB for main chunk
Image optimization: Use Next.js Image component always
Font optimization: Use next/font for loading

Security Checklist
Multi-Tenant Isolation

All queries include tenantId filter
API routes validate tenant access
No cross-tenant data leakage in responses
Audit logs for sensitive operations

Authentication

SSO token validation on every request
Secure token storage (httpOnly cookies preferred)
Session timeout after inactivity
Rate limiting on auth endpoints

Data Protection

Input sanitization on all forms
XSS protection via React's default escaping
CSRF tokens for state-changing operations
Encrypted sensitive data at rest

Forbidden Practices

NEVER use `any` type - use Prisma-generated types instead
NEVER query without tenantId for isolated models
NEVER expose internal IDs in URLs (use slugs/UUIDs)
NEVER trust client-side tenant/user data
NEVER use dangerouslySetInnerHTML without sanitization
NEVER store sensitive data in localStorage
NEVER commit console.log statements
NEVER use synchronous operations that block UI
NEVER import from src/ - use aliases (@/)
NEVER mutate props or state directly
NEVER skip error boundaries for async operations
NEVER reference database fields that don't exist in the schema
NEVER assign unvalidated query params to enum fields

Educational Module Specific
Activity System

Activities must track progress per student
Support multiple attempt tracking
Store completion time and accuracy
Generate reports for professionals

Accessibility (WCAG 2.1 AA)

All interactive elements keyboard accessible
ARIA labels for screen readers
Color contrast ratio > 4.5:1
Focus indicators visible
Reduced motion options respected

TEA-Specific Considerations

Simple, clear UI without overwhelming elements
Consistent navigation patterns
Visual schedules and progress indicators
Customizable difficulty levels
Positive reinforcement mechanisms
