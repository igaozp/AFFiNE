import { AcceptInvitePage } from '@affine/component/member-components';
import type { GetInviteInfoQuery } from '@affine/graphql';
import {
  acceptInviteByInviteIdMutation,
  ErrorNames,
  getInviteInfoQuery,
  UserFriendlyError,
} from '@affine/graphql';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  RouteLogic,
  useNavigateHelper,
} from '../../../components/hooks/use-navigate-helper';
import { AuthService, GraphQLService } from '../../../modules/cloud';
import { AppContainer } from '../../components/app-container';

/**
 * /invite/:inviteId page
 *
 * only for web
 */
const AcceptInvite = ({
  inviteInfo,
}: {
  inviteInfo: GetInviteInfoQuery['getInviteInfo'];
}) => {
  const { jumpToPage } = useNavigateHelper();

  const openWorkspace = useCallback(() => {
    jumpToPage(inviteInfo.workspace.id, 'all', RouteLogic.REPLACE);
  }, [inviteInfo.workspace.id, jumpToPage]);

  return (
    <AcceptInvitePage inviteInfo={inviteInfo} onOpenWorkspace={openWorkspace} />
  );
};

export const Component = () => {
  const authService = useService(AuthService);
  const isRevalidating = useLiveData(authService.session.isRevalidating$);
  const loginStatus = useLiveData(authService.session.status$);
  const params = useParams<{ inviteId: string }>();

  useEffect(() => {
    authService.session.revalidate();
  }, [authService]);

  const { jumpToSignIn } = useNavigateHelper();

  useEffect(() => {
    if (loginStatus === 'unauthenticated' && !isRevalidating) {
      // We can not pass function to navigate state, so we need to save it in atom
      jumpToSignIn(`/invite/${params.inviteId}`, RouteLogic.REPLACE);
    }
  }, [isRevalidating, jumpToSignIn, loginStatus, params.inviteId]);

  if (loginStatus === 'authenticated') {
    return <Middle />;
  }

  return null;
};

export const Middle = () => {
  const graphqlService = useService(GraphQLService);
  const params = useParams<{ inviteId: string }>();
  const navigateHelper = useNavigateHelper();

  const [data, setData] = useState<{
    inviteId: string;
    inviteInfo: GetInviteInfoQuery['getInviteInfo'];
  } | null>(null);

  useEffect(() => {
    (async () => {
      setData(null);
      const inviteId = params.inviteId || '';
      const res = await graphqlService.gql({
        query: getInviteInfoQuery,
        variables: {
          inviteId,
        },
      });

      // If the inviteId is invalid, redirect to 404 page
      if (!res || !res?.getInviteInfo) {
        return navigateHelper.jumpTo404();
      }

      // No mater sign in or not, we need to accept the invite
      await graphqlService.gql({
        query: acceptInviteByInviteIdMutation,
        variables: {
          workspaceId: res.getInviteInfo.workspace.id,
          inviteId,
          sendAcceptMail: true,
        },
      });

      setData({
        inviteId,
        inviteInfo: res.getInviteInfo,
      });
      return;
    })().catch(error => {
      const userFriendlyError = UserFriendlyError.fromAnyError(error);
      console.error(userFriendlyError);
      if (userFriendlyError.name === ErrorNames.ALREADY_IN_SPACE) {
        return navigateHelper.jumpToIndex();
      }
      if (
        userFriendlyError.name === ErrorNames.USER_NOT_FOUND ||
        userFriendlyError.name === ErrorNames.SPACE_OWNER_NOT_FOUND
      ) {
        return navigateHelper.jumpToExpired();
      }
      return navigateHelper.jumpTo404();
    });
  }, [graphqlService, navigateHelper, params.inviteId]);

  if (!data) {
    return <AppContainer fallback />;
  }

  return <AcceptInvite inviteInfo={data.inviteInfo} />;
};
