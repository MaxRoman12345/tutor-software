import { AuthCard } from '@/components/auth-card'

export default async function Page({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  const params = await searchParams

  return (
    <AuthCard title="Sorry, something went wrong.">
      {params?.error ? (
        <p className="text-sm text-neutral-500">Code error: {params.error}</p>
      ) : (
        <p className="text-sm text-neutral-500">An unspecified error occurred.</p>
      )}
    </AuthCard>
  )
}
