import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { IdentityReviewView } from "@/components/admin/identity/IdentityReviewView";

export default function IdentidadePage() {
  return (
    <RequireAdmin>
      <IdentityReviewView />
    </RequireAdmin>
  );
}
