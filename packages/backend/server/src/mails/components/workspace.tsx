import { AvatarWithName } from './template';

export interface WorkspaceProps {
  name: string;
  avatar?: string;
  size?: number;
}

export const Workspace = (props: WorkspaceProps) => {
  return (
    <AvatarWithName
      name={props.name}
      img={props.avatar}
      width={`${props.size}px`}
      height={`${props.size}px`}
    />
  );
};
