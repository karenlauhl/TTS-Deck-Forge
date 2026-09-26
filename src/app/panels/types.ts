import type { CardRecord } from '../../core/model/deck';
import type { FieldDef } from '../../core/template/types';

export interface CardTableProps {
  renderField?: (field: FieldDef, card: CardRecord, index: number) => React.ReactNode;
}
