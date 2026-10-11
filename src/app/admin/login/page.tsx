import { Suspense } from "react";
import { LoginFlow } from "./LoginFlow";

const ERRORS: Record<string, string> = {
  forbidden: "This account isn't allowed to manage the site.",
};

async function LoginWithParams({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginFlow initialError={error ? ERRORS[error] : undefined} />;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense>
      <LoginWithParams searchParams={searchParams} />
    </Suspense>
  );
}
