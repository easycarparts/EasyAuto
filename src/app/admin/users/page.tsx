import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getUsers, type AdminUser } from "@/lib/users-data";
import { setUserAdmin } from "./actions";

export const dynamic = "force-dynamic";

const PROVIDER_LABEL: Record<string, string> = { google: "Google", email: "Email", phone: "Phone" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await getUsers();
  const admins = users.filter((u) => u.isAdmin).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Users</h1>
          <p className="mt-1 text-sm text-muted">
            {users.length} account{users.length === 1 ? "" : "s"} · {admins} admin{admins === 1 ? "" : "s"} ·{" "}
            <Link href="/admin" className="font-semibold text-brand-600 hover:text-brand-700">
              ← Admin
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-faint">
            <tr>
              <th className="px-4 py-2.5 font-semibold">User</th>
              <th className="px-4 py-2.5 font-semibold">Sign-in</th>
              <th className="px-4 py-2.5 font-semibold">Listings</th>
              <th className="px-4 py-2.5 font-semibold">Joined</th>
              <th className="px-4 py-2.5 font-semibold">Last seen</th>
              <th className="px-4 py-2.5 font-semibold">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line/60 last:border-0 align-top">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar user={u} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {u.name ?? "—"}
                        {u.id === me.id && <span className="ml-1.5 text-xs font-normal text-faint">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-muted">{u.email ?? "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.providers.length === 0 && <span className="text-xs text-faint">—</span>}
                    {u.providers.map((p) => (
                      <span
                        key={p}
                        className="rounded-full border border-line bg-canvas px-2 py-0.5 text-xs font-medium text-body"
                      >
                        {PROVIDER_LABEL[p] ?? p}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-faint">{u.emailConfirmed ? "✓ confirmed" : "unconfirmed"}</p>
                </td>
                <td className="px-4 py-3 text-body">{u.ownedCount > 0 ? u.ownedCount : "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">{u.lastSignInAt ? fmtDate(u.lastSignInAt) : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.isAdmin ? (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">Admin</span>
                    ) : (
                      <span className="text-xs text-faint">User</span>
                    )}
                    {u.id !== me.id && (
                      <form action={setUserAdmin}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="makeAdmin" value={String(!u.isAdmin)} />
                        <button
                          type="submit"
                          className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-body hover:border-brand-300 hover:text-brand-700"
                        >
                          {u.isAdmin ? "Revoke" : "Make admin"}
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-faint">
        Profile data (name, avatar) comes from the sign-in provider — Google fills these in, email/OTP accounts may not.
      </p>
    </div>
  );
}

function Avatar({ user }: { user: AdminUser }) {
  const initials = (user.name ?? user.email ?? "?").slice(0, 1).toUpperCase();
  if (user.avatar) {
    // eslint-disable-next-line @next/next/no-img-element -- external provider avatar, no width/height known
    return <img src={user.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />;
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
      {initials}
    </span>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
