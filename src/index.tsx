import React from "react";
import { render } from "react-dom";

import { FocusStyleManager, InputGroup } from "@blueprintjs/core";

import "normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/datetime/lib/css/blueprint-datetime.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import "./app.css";

FocusStyleManager.onlyShowFocusOnTabs();

import { ReactNode, SyntheticEvent, useState } from "react";
import { getObserverTree, makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";
import { Button, MenuItem } from "@blueprintjs/core";
import { IItemRendererProps, Select, Suggest } from "@blueprintjs/select";
import "normalize.css";

type Block = {
  title?: string;
  string?: string;
  uid: string;
};

//TODO - 换成用函数而非比较字符串
//     比如：
/**
 * class OrConnector {
 *  calc(results: any[]) {
 *
 *  }
 * }
 */
type IConnector = "OR" | "AND";

interface IOperator<T> {
  label: string;
  filterMethod: (b?: T) => boolean;

  value: T;
  onChange: (value: T) => void;
  reset: () => void;

  Input: React.JSXElementConstructor<{
    value: T;
    onChange: (value: T) => void;
    onBlur: () => void;
  }>;
}

interface IFilterField {
  onSelect(operator: string): void;
  label: string;
  operators: IOperator<any>[];
  activeOperator: IOperator<any>;

  filterData: (b: Block[]) => Block[];
}

// ------------------------------
class FilterPlaceholder {
  constructor() {
    makeAutoObservable(this);
  }
  onSelect(name: string) {
    switch (name) {
      case "title":
        this.delegate = new TitleFilter();
        break;
      case "string":
        this.delegate = new StringFilter();
        break;
    }
  }
  filterOptions = [
    {
      name: "title",
      clazz: TitleFilter
    },
    {
      name: "string",
      clazz: StringFilter
    }
  ];

  delegate: null | IFilterField = null;
}

class StringFilter implements IFilterField {
  label: string = "string";
  operators: IOperator<any>[] = [
    new ContainsOperator(),
    new DoesNotContainsOperator()
  ];
  constructor() {
    makeAutoObservable(this);
  }

  activeOperator = this.operators[0];

  filterData = (blocks: Block[]) => {
    return blocks.filter((block) => {
      return this.activeOperator.filterMethod(block.string);
    });
  };

  onSelect(operator: string) {
    this.activeOperator.reset();
    this.activeOperator = this.operators.find((ope) => ope.label === operator)!;
  }
}

class TitleFilter implements IFilterField {
  label: string = "title";
  operators: IOperator<any>[] = [
    new ContainsOperator(),
    new DoesNotContainsOperator()
  ];
  activeOperator = this.operators[0];

  constructor() {
    makeAutoObservable(this);
  }

  filterData = (blocks: Block[]) => {
    return blocks.filter((block) => {
      return this.activeOperator.filterMethod(block.title);
    });
  };

  onSelect(operator: string) {
    this.activeOperator.reset();
    this.activeOperator = this.operators.find((ope) => ope.label === operator)!;
  }
}

// ---------------- filter end -------------

// ---------------- Operator start ------------

class DoesNotContainsOperator implements IOperator<string> {
  label = "does not contains";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (b?: string) => {
    return b ? !b.includes(this.value) : false;
  };

  value = "";

  onChange = (v: string) => {
    this.value = v;
  };

  reset() {
    this.value = "";
  }

  Input = TextInput;
}

class ContainsOperator implements IOperator<string> {
  label = "contains";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (b?: string) => {
    return b ? b.includes(this.value) : false;
  };

  value = "";

  onChange = (v: string) => {
    this.value = v;
  };

  reset() {
    this.value = "";
  }
  Input = TextInput;
}

class FilterGroup {
  label: string = "group";
  creating = true;
  filters: FilterPlaceholder[] = [];
  groups: FilterGroup[] = [];
  connector: IConnector = "AND";

  constructor() {
    makeAutoObservable(this);
    this.addNewFilter();
  }

  addNewFilter() {
    this.filters.push(new FilterPlaceholder());
  }

  addNewGroup(group: FilterGroup) {
    this.groups.push(group);
  }

  filterData(_source: Block[]): Block[] {
    console.log(_source, " = sou");
    if (this.connector === "AND") {
      let source = _source;
      console.log(source, " = ");
      this.filters.forEach((filter) => {
        source = filter.delegate!.filterData(source);
      });
      this.groups.forEach((group) => {
        source = group.filterData(source);
      });
      return source;
    } else {
      const filterResult = this.filters.reduce((p, filter) => {
        return [...p, ...filter.delegate!.filterData(_source)];
      }, [] as Block[]);
      const result = this.groups.reduce((p, group) => {
        return [...p, ...group.filterData(_source)];
      }, filterResult);
      return uniqueArray(result);
    }

    function uniqueArray<T extends { uid: string }>(objs: T[]) {
      // 根据对象的 uid 进行去重
      return Array.from(new Map(objs.map((obj) => [obj.uid, obj])).values());
    }
  }
}

// ---------------- Operator end ------------

class SearchInlineModel {
  group = null as null | FilterGroup;
  constructor() {
    makeAutoObservable(this);
  }

  addFilterCondition() {
    if (!this.group) {
      this.group = new FilterGroup();
    }
  }

  search() {
    if (!this.group) {
      return;
    }
    const result = this.group.filterData([
      {
        title: "中国",
        uid: "1"
      },
      {
        title: "没理解",
        uid: "2"
      },
      {
        title: "太深",
        uid: "3"
      },
      {
        title: "英国",
        uid: "4"
      },
      {
        string: "天赛有几飞了",
        uid: "5"
      }
    ]);
    console.log(result, " = result ");
  }
}

// ------------------- React Start ---------------

const TextInput = (props: {
  onBlur: () => void;
  value: string;
  onChange: (v: string) => void;
}) => {
  return (
    <InputGroup
      value={props.value}
      onChange={(e) => {
        props.onChange((e.target as HTMLInputElement).value);
      }}
      onBlur={props.onBlur}
    />
  );
};

const SearchInline = observer(() => {
  const model = useState(() => new SearchInlineModel())[0];
  console.log("render -- ");
  return (
    <div>
      <section>
        {model.group ? (
          <SearchGroup group={model.group} onSearch={model.search} />
        ) : null}
      </section>
      <Button
        onClick={() => {
          model.addFilterCondition();
        }}
      >
        Add filter condition
      </Button>
    </div>
  );
});
const OperatorsSelect = observer(
  (props: {
    onSelect: (label: string) => void;
    items: { label: string }[];
    activeItem: { label: string };
  }) => {
    console.log(props.activeItem, " =active");
    return (
      <Select
        items={props.items}
        itemsEqual={function (a, b) {
          return a.label === b.label;
        }}
        inputProps={{
          disabled: true
        }}
        itemRenderer={function (
          item,
          { modifiers, handleClick }: IItemRendererProps
        ) {
          console.log(item, " operator");
          return (
            <MenuItem
              {...{
                active: modifiers.active,
                disabled: modifiers.disabled,
                key: item.label,
                // label: film.year.toString(),
                onClick: handleClick,
                // onFocus: handleFocus,
                // ref,
                text: item.label
              }}
              text={item.label}
            ></MenuItem>
          );
        }}
        onItemSelect={function (
          item,
          event?: SyntheticEvent<HTMLElement, Event> | undefined
        ) {
          props.onSelect(item.label);
        }}
      >
        <Button
          text={props.activeItem.label}
          rightIcon="double-caret-vertical"
        />
      </Select>
    );
  }
);
const FieldsSelect = (props: {
  onSelect: (name: string) => void;
  items: { name: string }[];
}) => {
  return (
    <Suggest
      items={props.items}
      itemsEqual={function (a, b) {
        return a.name === b.name;
      }}
      inputValueRenderer={function (item) {
        return item.name;
      }}
      itemPredicate={(query, item, index) => {
        return item.name.indexOf(query) >= 0;
      }}
      itemRenderer={function (
        item,
        { modifiers, handleClick }: IItemRendererProps
      ) {
        console.log(item, " = item");
        return (
          <MenuItem
            {...{
              active: modifiers.active,
              disabled: modifiers.disabled,
              key: item.name,
              // label: film.year.toString(),
              onClick: handleClick,
              // onFocus: handleFocus,
              // ref,
              text: item.name
            }}
            text={item.name}
          ></MenuItem>
        );
      }}
      onItemSelect={function (
        item,
        event?: SyntheticEvent<HTMLElement, Event> | undefined
      ) {
        props.onSelect(item.name);
      }}
    />
  );
};

const SearchGroup = observer(
  (props: { group: FilterGroup; onSearch: () => void }) => {
    console.log(props, " = props");
    return (
      <div>
        {props.group.filters.map((f, i) => {
          return (
            <div key={i} className="flex">
              <FieldsSelect
                items={f.filterOptions}
                onSelect={(name) => {
                  f.onSelect(name);
                }}
              ></FieldsSelect>
              {f.delegate ? (
                <div>
                  <OperatorsSelect
                    items={f.delegate.operators}
                    onSelect={(operator) => {
                      f.delegate!.onSelect(operator);
                    }}
                    activeItem={f.delegate.activeOperator}
                  />
                  <f.delegate.activeOperator.Input
                    key={f.delegate.activeOperator.label}
                    {...{
                      onChange: f.delegate.activeOperator.onChange,
                      value: f.delegate.activeOperator.value
                    }}
                    onBlur={() => {
                      props.onSearch();
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }
);

const App = () => (
  <div>
    <SearchInline />
  </div>
);

render(<App />, document.getElementById("root"));
