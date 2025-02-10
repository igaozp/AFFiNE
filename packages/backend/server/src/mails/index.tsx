import { render as rawRender } from '@react-email/components';

import {
  TeamBecomeAdmin,
  TeamBecomeCollaborator,
  TeamDeleteIn24Hours,
  TeamDeleteInOneMonth,
  TeamExpired,
  TeamExpireSoon,
  TeamLicense,
  TeamWorkspaceDeleted,
  TeamWorkspaceUpgraded,
} from './teams';
import {
  ChangeEmail,
  ChangeEmailNotification,
  ChangePassword,
  SetPassword,
  SignIn,
  SignUp,
  VerifyChangeEmail,
  VerifyEmail,
} from './users';
import {
  Invitation,
  InvitationAccepted,
  LinkInvitationApproved,
  LinkInvitationReviewDeclined,
  LinkInvitationReviewRequest,
  MemberLeave,
  MemberRemoved,
  OwnershipReceived,
  OwnershipTransferred,
} from './workspaces';

type EmailContent = {
  subject: string;
  html: string;
};

function render(component: React.ReactElement) {
  return rawRender(component, {
    pretty: AFFiNE.node.test,
  });
}

type Props<T> = T extends React.FC<infer P> ? P : never;
export type EmailRenderer<Props> = (props: Props) => Promise<EmailContent>;

function make<T extends React.ComponentType<any>>(
  Component: T,
  subject: string | ((props: Props<T>) => string)
): EmailRenderer<Props<T>> {
  return async props => {
    if (!props && AFFiNE.node.test) {
      // @ts-expect-error test only
      props = Component.PreviewProps;
    }
    return {
      subject: typeof subject === 'function' ? subject(props) : subject,
      html: await render(<Component {...props} />),
    };
  };
}

// ================ User ================
export const renderSignInMail = make(SignIn, 'Sign in to AFFiNE');
export const renderSignUpMail = make(
  SignUp,
  'Your AFFiNE account is waiting for you!'
);
export const renderSetPasswordMail = make(
  SetPassword,
  'Set your AFFiNE password'
);
export const renderChangePasswordMail = make(
  ChangePassword,
  'Modify your AFFiNE password'
);
export const renderVerifyEmailMail = make(
  VerifyEmail,
  'Verify your email address'
);
export const renderChangeEmailMail = make(
  ChangeEmail,
  'Change your email address'
);
export const renderVerifyChangeEmailMail = make(
  VerifyChangeEmail,
  'Verify your new email address'
);
export const renderChangeEmailNotificationMail = make(
  ChangeEmailNotification,
  'Account email address changed'
);

// ================ Workspace ================
export const renderMemberInvitationMail = make(
  Invitation,
  props => `${props.user.email} invited you to join ${props.workspace.name}`
);
export const renderMemberAcceptedMail = make(
  InvitationAccepted,
  props => `${props.user.email} accepted your invitation`
);
export const renderMemberLeaveMail = make(
  MemberLeave,
  props => `${props.user.email} left ${props.workspace.name}`
);
export const renderLinkInvitationReviewRequestMail = make(
  LinkInvitationReviewRequest,
  props => `New request to join ${props.workspace.name}`
);
export const renderLinkInvitationApproveMail = make(
  LinkInvitationApproved,
  props => `Your request to join ${props.workspace.name} has been approved`
);
export const renderLinkInvitationDeclineMail = make(
  LinkInvitationReviewDeclined,
  props => `Your request to join ${props.workspace.name} was declined`
);
export const renderMemberRemovedMail = make(
  MemberRemoved,
  props => `You have been removed from ${props.workspace.name}`
);
export const renderOwnershipTransferredMail = make(
  OwnershipTransferred,
  props => `Your ownership of ${props.workspace.name} has been transferred`
);
export const renderOwnershipReceivedMail = make(
  OwnershipReceived,
  props => `You are now the owner of ${props.workspace.name}`
);

// ================ Team ================
export const renderTeamWorkspaceUpgradedMail = make(
  TeamWorkspaceUpgraded,
  props =>
    props.isOwner
      ? 'Your workspace has been upgraded to team workspace! 🎉'
      : `${props.workspace.name} has been upgraded to team workspace! 🎉`
);

export const renderTeamBecomeAdminMail = make(
  TeamBecomeAdmin,
  props => `You are now an admin of ${props.workspace.name}`
);

export const renderTeamBecomeCollaboratorMail = make(
  TeamBecomeCollaborator,
  props => `Your role has been changed in ${props.workspace.name}`
);
export const renderTeamDeleteIn24HoursMail = make(
  TeamDeleteIn24Hours,
  props =>
    `[Action Required] Final warning: Your workspace ${props.workspace.name} will be deleted in 24 hours`
);
export const renderTeamDeleteIn1MonthMail = make(
  TeamDeleteInOneMonth,
  props =>
    `[Action Required] Important: Your workspace ${props.workspace.name} will be deleted soon`
);

export const renderTeamWorkspaceDeletedMail = make(
  TeamWorkspaceDeleted,
  props => `Your workspace ${props.workspace.name} has been deleted`
);

export const renderTeamWorkspaceExpireSoonMail = make(
  TeamExpireSoon,
  props =>
    `[Action Required] Your ${props.workspace.name} team workspace will expire soon`
);

export const renderTeamWorkspaceExpiredMail = make(
  TeamExpired,
  props => `Your ${props.workspace.name} team workspace has expired`
);

export const renderTeamLicenseMail = make(
  TeamLicense,
  'Your AFFiNE Self-Hosted Team Workspace license is ready'
);
