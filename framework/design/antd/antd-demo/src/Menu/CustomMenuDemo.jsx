import React, { PropTypes } from 'react'

const menu = (
  <Menu
    style={{ marginTop: 100 }}
    mode="inline"
  >
    <SubMenu key="basic" title="Basic">
      <MenuItemGroup title="按钮">
        <Menu.Item key="/button/type">
          <Link to="/button/type">按钮类型</Link>
        </Menu.Item>
        <Menu.Item key="/button/icon">
          <Link to="/button/icon">图标按钮</Link>
        </Menu.Item>
        <Menu.Item key="3">
          <Link to="/button/size">按钮大小</Link>
        </Menu.Item>
        <Menu.Item key="4">
          <Link to="/button/disable">不可用按钮</Link>
        </Menu.Item>
        <Menu.Item key="5">
          <Link to="/button/loading">加载中按钮</Link>
        </Menu.Item>
        <Menu.Item key="6">
          <Link to="/button/composite">组合按钮</Link>
        </Menu.Item>
      </MenuItemGroup>
      <MenuItemGroup title="图标" />
    </SubMenu>
    <SubMenu key="form" title="Form">
      <MenuItemGroup title="输入框">
        <Menu.Item key="/input/size">
          <Link to="/input/size">输入框大小</Link>
        </Menu.Item>
        <Menu.Item key="/input/addon">
          <Link to="/input/addon">输入框前置/后置标签</Link>
        </Menu.Item>
        <Menu.Item key="/input/group">
          <Link to="/input/group">输入框组合</Link>
        </Menu.Item>
      </MenuItemGroup>
      <MenuItemGroup title="数字输入框">
        <Menu.Item key="/input-number/size">
          <Link to="/input-number/size">数字输入框大小</Link>
        </Menu.Item>
      </MenuItemGroup>
      <MenuItemGroup title="单选框">
        <Menu.Item key="/radio/size">
          <Link to="/radio/size">按钮单选框大小</Link>
        </Menu.Item>
      </MenuItemGroup>
      <MenuItemGroup title="选择器">
        <Menu.Item key="/select/size">
          <Link to="/select/size">选择器</Link>
        </Menu.Item>
      </MenuItemGroup>
      <MenuItemGroup title="树选择">
        <Menu.Item key="/tree-select/basic">
          <Link to="/tree-select/basic">树选择基本使用</Link>
        </Menu.Item>
      </MenuItemGroup>
      <MenuItemGroup title="日期选择框">
        <Menu.Item key="/datepicker/size">
          <Link to="/datepicker/size">日期选择框大小</Link>
        </Menu.Item>
      </MenuItemGroup>
      <MenuItemGroup title="时间选择框">
        <Menu.Item key="/timepicker/size">
          <Link to="/timepicker/size">时间选择框大小</Link>
        </Menu.Item>
      </MenuItemGroup>
    </SubMenu>
    <SubMenu key="view" title="View">
      <MenuItemGroup title="对话框">
        <Menu.Item key="/modal/basic">
          <Link to="/modal/basic">模态框基本使用</Link>
        </Menu.Item>
      </MenuItemGroup>
      <MenuItemGroup title="下拉菜单">
        <Menu.Item key="/dropdown/button">
          <Link to="/dropdown/button">下拉按钮</Link>
        </Menu.Item>
      </MenuItemGroup>
    </SubMenu>
    <SubMenu key="navigation" title="Navigation">
      <MenuItemGroup title="菜单">
        <Menu.Item key="/menu/horizontal">
          <Link to="/menu/horizontal">水平导航菜单</Link>
        </Menu.Item>
        <Menu.Item key="/menu/inline">
          <Link to="/menu/inline">内嵌导航菜单</Link>
        </Menu.Item>
        <Menu.Item key="/menu/vertical">
          <Link to="/menu/vertical">垂直导航菜单</Link>
        </Menu.Item>
      </MenuItemGroup>
    </SubMenu>
  </Menu>
);

export default fucntion CustomMenuDemo () {
  return (

  );
}
