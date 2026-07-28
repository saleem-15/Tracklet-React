import React from 'react';
import { CustomSelectDropdown, SelectOption } from './CustomSelectDropdown';

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterSelectDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: FilterOption[];
  labelPrefix: string;
  isActive?: boolean;
}

export const FilterSelectDropdown: React.FC<FilterSelectDropdownProps> = ({
  value,
  onChange,
  options,
  labelPrefix,
  isActive = false,
}) => {
  const selectOptions: SelectOption<string>[] = options.map((opt) => ({
    label: opt.label,
    value: opt.value,
  }));

  return (
    <CustomSelectDropdown
      value={value}
      onChange={onChange}
      options={selectOptions}
      labelPrefix={labelPrefix}
      variant="filter"
      isActive={isActive}
    />
  );
};
