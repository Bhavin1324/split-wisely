import { Drawer, List, Button, Tag, Avatar } from "antd";
import { X, Plus } from "lucide-react";
import { formatDate } from "../../utils/date";

export function GroupMembersDrawer({
  isOpen,
  onClose,
  groupMembers,
  userId,
  getProfile,
  onOpenAddMember,
  onRemoveMember,
}: {
  isOpen: boolean;
  onClose: () => void;
  groupMembers: any[];
  userId: string;
  getProfile: (id: string) => any;
  onOpenAddMember: () => void;
  onRemoveMember: (id: string, name: string) => void;
}) {
  return (
    <Drawer
      title="Group Members"
      placement="right"
      onClose={onClose}
      open={isOpen}
      width={360}
    >
      <List
        dataSource={groupMembers}
        renderItem={(m) => {
          const profile = getProfile(m.user_id);
          const name = profile?.full_name ?? m.user_id;
          const isMe = m.user_id === userId;
          return (
            <List.Item
              actions={
                !isMe
                  ? [
                      <Button
                        key="remove"
                        type="text"
                        danger
                        icon={<X className="h-4 w-4" />}
                        onClick={() => {
                          onRemoveMember(m.user_id, name);
                          onClose();
                        }}
                      >
                        Remove
                      </Button>,
                    ]
                  : [
                      <Tag key="me" color="blue">
                        You
                      </Tag>,
                    ]
              }
            >
              <List.Item.Meta
                avatar={
                  <Avatar style={{ backgroundColor: "var(--color-primary-500)" }}>
                    {name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </Avatar>
                }
                title={<span className="font-semibold text-text-base">{name}</span>}
                description={
                  <span className="text-xs text-text-muted">
                    Joined {formatDate(m.joined_at)}
                  </span>
                }
              />
            </List.Item>
          );
        }}
      />
      <Button
        type="dashed"
        block
        icon={<Plus className="h-4 w-4" />}
        className="mt-6"
        onClick={() => {
          onClose();
          onOpenAddMember();
        }}
      >
        Add New Member
      </Button>
    </Drawer>
  );
}
