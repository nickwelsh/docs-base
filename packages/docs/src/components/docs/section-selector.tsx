'use client';
import ChevronDown from '~icons/carbon/chevron-down';
import { Button } from '../ui/button.js';
import { Menu, MenuDescription, MenuItem, MenuLabel, MenuTrigger } from '../ui/menu.js';
import type { DocsSection } from '../../lib/docs-navigation.js';

export function SectionSelector({ sections, current }: { sections: Array<DocsSection>; current: DocsSection }) {
    return (
        <MenuTrigger>
            <Button intent="plain" size="sm" className="section-trigger" aria-label="Documentation section">
                <span>{current.name}</span>
                <ChevronDown />
            </Button>
            <Menu
                aria-label="Documentation sections"
                items={sections}
                selectionMode="single"
                selectedKeys={[current.id]}
                popover={{ placement: 'bottom start', className: 'docs-section-menu' }}
            >
                {(section) => (
                    <MenuItem id={section.id} href={section.url} textValue={section.name}>
                        {section.icon}
                        <MenuLabel>{section.name}</MenuLabel>
                        {section.description !== undefined && <MenuDescription>{section.description}</MenuDescription>}
                    </MenuItem>
                )}
            </Menu>
        </MenuTrigger>
    );
}
