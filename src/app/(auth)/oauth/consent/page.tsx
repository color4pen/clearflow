import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/infrastructure/auth";
import { oauthClientRepository, organizationRepository } from "@/infrastructure/repositories";

const OAUTH_PARAMS_COOKIE = "oauth_pending_params";

type OAuthPendingParams = {
  clientId: string;
  redirectUri: string;
  responseType: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string | null;
  resource?: string | null;
};

export default async function OAuthConsentPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const rawParams = cookieStore.get(OAUTH_PARAMS_COOKIE)?.value;
  if (!rawParams) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">セッションが期限切れです</h1>
          <p className="text-sm text-gray-600">
            認可セッションが期限切れになりました。もう一度接続を試みてください。
          </p>
        </div>
      </div>
    );
  }

  let params: OAuthPendingParams;
  try {
    params = JSON.parse(rawParams) as OAuthPendingParams;
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">無効なリクエスト</h1>
          <p className="text-sm text-gray-600">
            認可リクエストが無効です。もう一度試みてください。
          </p>
        </div>
      </div>
    );
  }

  const client = await oauthClientRepository.findByClientId(params.clientId);
  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">クライアントが見つかりません</h1>
          <p className="text-sm text-gray-600">
            登録されていないクライアントからのリクエストです。
          </p>
        </div>
      </div>
    );
  }

  const orgId = session.user.organizationId;
  const org = orgId ? await organizationRepository.findById(orgId, orgId) : null;
  const orgName = org?.name ?? null;

  const userName = session.user.name ?? session.user.email ?? "ユーザー";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">接続の許可</h1>
        <p className="text-sm text-gray-600 mb-4">
          <strong>{client.clientName}</strong> が clearflow への接続を要求しています。
        </p>

        <div className="bg-gray-50 rounded p-4 mb-4 text-sm">
          <div className="mb-2">
            <span className="font-medium text-gray-700">アクセス内容:</span>
            <span className="ml-2 text-gray-600">clearflow の MCP ツールへのアクセスを許可</span>
          </div>
          <div className="mb-2">
            <span className="font-medium text-gray-700">ユーザー:</span>
            <span className="ml-2 text-gray-600">{userName}</span>
          </div>
          {orgName && (
            <div className="mb-2">
              <span className="font-medium text-gray-700">組織:</span>
              <span className="ml-2 text-gray-600">{orgName}</span>
            </div>
          )}
        </div>

        <form action="/api/oauth/authorize" method="POST" className="flex gap-3">
          <button
            type="submit"
            name="action"
            value="allow"
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            許可
          </button>
          <button
            type="submit"
            name="action"
            value="deny"
            className="flex-1 bg-white text-gray-700 text-sm font-medium py-2 px-4 rounded border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            拒否
          </button>
        </form>
      </div>
    </div>
  );
}
