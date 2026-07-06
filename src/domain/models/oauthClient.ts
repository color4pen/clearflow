/** OAuth クライアントのドメイン型。動的クライアント登録（RFC 7591）で生成される。 */

export type OAuthClient = {
  id: string;
  clientId: string;
  clientName: string;
  redirectUris: string[];
  tokenEndpointAuthMethod: string;
  grantTypes: string[];
  responseTypes: string[];
  clientIdIssuedAt: Date;
  createdAt: Date;
};
