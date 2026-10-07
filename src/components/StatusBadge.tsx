import { Badge } from '@fluentui/react-components';
import { CheckmarkCircle16Regular, Clock16Regular, ErrorCircle16Regular, Warning16Filled } from '@fluentui/react-icons';
import type { ProgressStatus } from '@/api/types';
import { statusLabels } from '@/lib/format';

/** Status badges (Section 8.1): colour is never the only cue - each badge carries its word. */
export function StatusBadge({ status }: { status: ProgressStatus }) {
  switch (status) {
    case 'ON_TRACK':
      return <Badge appearance="tint" color="success" icon={<CheckmarkCircle16Regular />}>{statusLabels.ON_TRACK}</Badge>;
    case 'DUE':
      return <Badge appearance="tint" color="warning" icon={<Clock16Regular />}>{statusLabels.DUE}</Badge>;
    case 'OVERDUE':
      return <Badge appearance="filled" color="danger" icon={<ErrorCircle16Regular />}>{statusLabels.OVERDUE}</Badge>;
    case 'CONCERN':
      return <Badge appearance="outline" color="danger" icon={<Warning16Filled />}>{statusLabels.CONCERN}</Badge>;
    default:
      return null;
  }
}
