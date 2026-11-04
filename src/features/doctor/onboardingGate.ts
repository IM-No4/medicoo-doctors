// Where a doctor belongs right after signing in. Mirrors the doctor web app (routeForApprovalStatus) and the checks the onboarding screen itself
// makes: an account with no application yet ('not-applied'), a draft, a pending or a rejected application goes to onboarding; only a doctor who
// has an approved profile goes to the dashboard.
export const doctorNeedsOnboarding = (profile: any): boolean => {
  if (!profile) return false; // no information (offline, empty answer): do not lock the doctor out of the app
  const status: string | undefined = profile.approvalStatus;
  const hasApprovedProfile = Boolean(
    status === 'approved' ||
      profile.hasApprovedProfile ||
      (profile.approvedProfile && Object.keys(profile.approvedProfile).length > 0) ||
      profile.lastApprovedAt ||
      profile.approvedAt ||
      profile.verifiedAt ||
      profile.isApproved ||
      profile.isOnboarded ||
      profile.onboardingCompleted
  );
  return !hasApprovedProfile;
};
