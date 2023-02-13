import { ReactComponent as EmptySymbol } from '../../../assets/empty-symbol.svg';
import { ReactComponent as AddSymbol } from '../../../assets/add-symbol.svg';
import { ReactComponent as ComponentSymbol } from '../../../assets/component-symbol.svg';
import { ReactComponent as InspectSymbol } from '../../../assets/inspect-symbol.svg';
import { ReactComponent as EditSymbol } from '../../../assets/edit-symbol.svg';
import { ReactComponent as HomeSymbol } from '../../../assets/home-symbol.svg';
import { ReactComponent as PropsSymbol } from '../../../assets/props-symbol.svg';
import { ReactComponent as ReloadSymbol } from '../../../assets/reload-symbol.svg';
import { ReactComponent as StylesSymbol } from '../../../assets/styles-symbol.svg';
import { ReactComponent as DivSymbol } from '../../../assets/div-symbol.svg';
import { ReactComponent as ChevronSymbol } from '../../../assets/chevron-symbol.svg';
import { ReactComponent as PreviewSymbol } from '../../../assets/preview-symbol.svg';
import { ReactComponent as HamburgerSymbol } from '../../../assets/hamburger-symbol.svg';
import { ReactComponent as MoreSymbol } from '../../../assets/more-symbol.svg';
import { ReactComponent as BranchSymbol } from '../../../assets/branch-symbol.svg';
import { ReactComponent as CommitSymbol } from '../../../assets/commit-symbol.svg';
import { ReactComponent as SyncSymbol } from '../../../assets/sync-symbol.svg';

export const symbols = {
    empty: EmptySymbol,
    add: AddSymbol,
    component: ComponentSymbol,
    inspect: InspectSymbol,
    edit: EditSymbol,
    home: HomeSymbol,
    props: PropsSymbol,
    reload: ReloadSymbol,
    styles: StylesSymbol,
    div: DivSymbol,
    chevron: ChevronSymbol,
    preview: PreviewSymbol,
    hamburger: HamburgerSymbol,
    more: MoreSymbol,
    branch: BranchSymbol,
    commit: CommitSymbol,
    sync: SyncSymbol,
};

export type SymbolName = keyof typeof symbols;
