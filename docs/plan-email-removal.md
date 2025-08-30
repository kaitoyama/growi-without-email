# GROWI カスタム: OAuth の email scope 廃止とメール機能の停止 設計・実装計画

このドキュメントは、以下の要件を満たすための改修計画です。

- OAuth の required scope から `email` を除外する
- メールに関連する機能をすべてコメントアウト/無効化する
- メールアドレスによるアカウント作成を廃止する（登録・有効化・招待・パスワードリセット等）

---

## 背景とゴール

- サインインに `email` を用いない運用へ移行する。
- 外部認証(Google/OIDC/SAML)・ローカル認証/LDAPを、email なしで成立させる。
- 既存ユーザーの `email` フィールドは残置（DB削除はしない）が、UI/設定/API からは基本非表示/非使用とする。

---

## 影響範囲（概観）

- 認証まわり
  - OIDC/Google の scope／マッピング
  - SAML/LDAP の email マッピング（無効化/任意化）
  - 外部アカウント紐付けの「同一メール扱い」ロジック
- アカウント登録・初期セットアップ
  - Installer・Registration（メール入力の撤廃）
  - 招待メール・登録確認メールの送信停止
- メール配信全般
  - SMTP/SES 設定画面、テスト送信、通知等
  - パスワードリセット（メール送信式）
- プロフィール/設定 UI
  - メール編集欄、サイドバー表示、公開設定等

---

## 実装方針

### 1) OAuth scope から `email` を除外
- OIDC: `apps/app/src/server/service/passport.ts`
  - `OidcStrategy` の `params: { scope: 'openid email profile' }` から `email` を削除 → `'openid profile'`。
- Google: `apps/app/src/server/routes/login-passport.js`
  - `passport.authenticate('google', { scope: ['profile', 'email'] })` から `email` を削除 → `['profile']`。

併せてコールバックでの email 依存を排除（後述）。

### 2) 外部アカウントマッピングの email 依存撤廃
- Google コールバック: `apps/app/src/server/routes/login-passport.js`
  - `response.emails` を参照して `username/email` を上書きしている処理を削除。
  - `username` は `displayName`（言語設定に応じた `givenName/familyName` 連結など）から生成。重複時は自動サフィックス付与等で対応（既存の重複ハンドリングを利用）。
- OIDC コールバック: 同ファイル
  - `email: response[attrMapMail]` の設定は削除 or オプショナル化（存在しなければセットしない）。
- SAML コールバック: 同ファイル
  - `email: response[attrMapMail]` の設定は削除 or オプショナル化。
- 「同一メールを同一ユーザーとみなす」判定の停止:
  - `apps/app/src/server/service/passport.ts`
    - `isSameEmailTreatedAsIdenticalUser` は常に `false` を返すように変更、または関連設定を無視。
  - `apps/app/src/server/service/external-account.ts`
    - `getOrCreateUser` で email ベースの探索条件を使わないようにする。

### 3) メールアドレスによるアカウント作成の廃止
- サーバー
  - インストーラ: `apps/app/src/server/routes/apiv3/installer.ts`
    - `registerForm.email` のバリデーション/保存を撤廃。`User.createUser(...)` には `email` を渡さない。
  - 登録/有効化: `apps/app/src/server/routes/apiv3/user-activation.ts`
    - メールトークン発行/送信機構（`makeRegistrationEmailToken` など）をコメントアウトし、API を 400/404 返却で停止。
  - 個人設定: `apps/app/src/server/routes/apiv3/personal-setting/index.js`
    - `email` の入力・重複チェック・更新 API を無効化（フィールド無視）。
  - User モデル: `apps/app/src/server/models/user.js`
    - `createUserByEmail*` 系ヘルパーを温存しつつ、`email` が `undefined` の場合は重複カウントやランダムメール生成をスキップするようガードを追加（実装時）。
    - `isEmailSet`／`isEmailPublished` は UI 非表示により実質的に不使用化。
- クライアント
  - インストーラ UI: `apps/app/src/client/components/InstallerForm.tsx`
    - メール入力欄を削除。送信ペイロードから `email` を除外。
  - 登録フォーム: `apps/app/src/client/components/LoginForm/LoginForm.tsx`
    - `email` 項目とメール送信ベースの登録フローを削除。
  - 招待/登録完了 UI: `CompleteUserRegistrationForm.tsx`, `InvitedForm.tsx`
    - メールに依存する表示・入力を削除。

### 4) メール機能の一括停止
- パスワードリセット
  - ルート: `apps/app/src/server/routes/apiv3/forgot-password.js`, `apps/app/src/server/routes/forgot-password.ts`
    - 全 API/ページを無効化（404 or 設定フラグで OFF 固定）。
  - UI: `apps/app/src/client/components/PasswordResetRequestForm.tsx`, `PasswordResetExecutionForm.tsx`
    - 画面リンク/フォームを非表示（ログイン画面からのリンクも削除）。
- メール送信設定（SMTP/SES）
  - UI: `apps/app/src/client/components/Admin/App/MailSetting.tsx`, `SmtpSetting.tsx`, `SesSetting.tsx`
    - タブごと非表示 or 「このインスタンスでは無効」表示。
  - API: `apps/app/src/server/routes/apiv3/app-settings.js`
    - メール送信系の保存/テスト送信エンドポイントを無効化。
  - サービス: `apps/app/src/server/service/mail.ts`
    - 呼び出し箇所がなくなるため現状維持（削除はしない）。
- メール表示/編集 UI
  - サイドバー: `PersonalDropdown.tsx` の email 表示を削除。
  - プロフィール設定: `Me/BasicInfoSettings.tsx` の email 入力欄を削除。

### 5) 設定画面の調整（email 関連）
- Admin > Security
  - Google/OIDC/SAML/LDAP の `isSameEmailTreatedAsIdenticalUser`, `attrMapMail` など email 項目は非表示。
  - バリデーション/保存 API: `apps/app/src/server/routes/apiv3/security-settings/index.js` の email 項目を無視。

### 6) マイグレーション/互換
- 既存 DB の `User.email` は残置（unique+sparse のため `undefined` でも問題なし）。
- 既存ユーザーで `isGravatarEnabled` が true の場合、`email` が空ならデフォルトアイコンにフォールバック済みのため実害なし。
- 外部アカウントの紐付けルール変更（email 不使用）により、初回ログイン時の自動結合条件が緩和/変更される点は周知。

### 7) フラグ/ロールバック
- まとめて戻す必要が出た場合に備え、`GROWI_DISABLE_EMAIL_FEATURES`（.env）などのフラグで UI/ルートのガードを残す実装も可。
- 初回はハード無効化（UI/ルートを削除/コメントアウト）で実装し、必要なら段階的にフラグ化。

---

## 具体的変更箇所一覧（ファイル）

- OAuth/認証
  - `apps/app/src/server/service/passport.ts`
    - OIDC scope 変更: `'openid profile'`
    - `isSameEmailTreatedAsIdenticalUser` を無効化
  - `apps/app/src/server/routes/login-passport.js`
    - Google 認可 scope から `email` を削除
    - Google/OIDC/SAML コールバックでの `email` マッピング削除
- 外部アカウント
  - `apps/app/src/server/service/external-account.ts`
    - email 一致判定を使用しないよう変更
  - `apps/app/src/server/models/external-account.ts`
    - `findOrRegister` の email ベース探索をバイパス
- ユーザー/登録
  - `apps/app/src/server/models/user.js`
    - `createUserByEmail*` 内の email 未指定時の重複チェック/ランダム生成をスキップ（ガード追加）
  - `apps/app/src/server/routes/apiv3/installer.ts`
    - email 入力/保存の撤廃
  - `apps/app/src/server/routes/apiv3/user-activation.ts`
    - メールによる登録系の停止
  - `apps/app/src/server/routes/apiv3/personal-setting/index.js`
    - email 更新 API の無効化
- メール機能
  - `apps/app/src/server/routes/apiv3/forgot-password.js`, `apps/app/src/server/routes/forgot-password.ts`
    - ルート停止
  - `apps/app/src/server/routes/apiv3/app-settings.js`
    - メール設定/テスト送信の停止
  - `apps/app/src/server/service/mail.ts`
    - 呼び出し無し（残置）
- フロントエンド
  - `apps/app/src/client/components/LoginForm/LoginForm.tsx`
  - `apps/app/src/client/components/InstallerForm.tsx`
  - `apps/app/src/client/components/CompleteUserRegistrationForm.tsx`
  - `apps/app/src/client/components/InvitedForm.tsx`
  - `apps/app/src/client/components/PasswordReset*`
  - `apps/app/src/client/components/Sidebar/SidebarNav/PersonalDropdown.tsx`
  - `apps/app/src/client/components/Me/BasicInfoSettings.tsx`
  - `apps/app/src/client/components/Admin/App/*Mail*`
  - `apps/app/src/client/components/Admin/Security/*`（email 関連項目の非表示）

---

## 実施ステップ（実装順）

1. OIDC/Google の scope 変更＋コールバックの email 依存排除
2. 外部アカウント email 紐付けロジック停止
3. インストーラ/登録/個人設定から email 入力・更新を撤廃
4. パスワードリセット/メール設定/通知の UI・API を停止
5. プロフィール/サイドバーの email 表示を削除
6. Admin Security の email 関連 UI/API を停止
7. ビルド・動作確認、e2e/ユニットの該当テスト調整

---

## 受け入れ条件（動作確認項目）

- Google/OIDC ログインが `email` scope 無しで成功する
- 新規ユーザー作成（外部/ローカル）が email 無しで可能（UI/API が通る）
- ログイン画面にメール登録/パスワードリセットの導線が無い
- 管理画面にメール関連タブ/設定が表示されない
- 個人設定で email が編集できない（項目非表示）
- メール送信（SMTP/SES/通知/招待/リセット）が一切行われない

---

## 備考

- 既存の `email` フィールドは DB に残置されます（既存データの保持目的）。
- 実運用で「email を完全に消去」する場合は、別途マイグレーションと運用周知が必要です。

