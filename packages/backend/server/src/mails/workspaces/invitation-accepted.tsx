import { TEST_USER, TEST_WORKSPACE } from '../common';
import {
  Content,
  P,
  Template,
  Title,
  User,
  type UserProps,
  Workspace,
  type WorkspaceProps,
} from '../components';

export type InvitationAcceptedProps = {
  user: UserProps;
  workspace: WorkspaceProps;
};

export default function InvitationAccepted(props: InvitationAcceptedProps) {
  const { user, workspace } = props;
  return (
    <Template>
      <Title>{user.email} accepted your invitation</Title>
      <Content>
        <P>
          <User {...user} /> has joined <Workspace {...workspace} />
        </P>
      </Content>
    </Template>
  );
}

InvitationAccepted.PreviewProps = {
  user: TEST_USER,
  workspace: TEST_WORKSPACE,
};
