"use client";

import styled from "styled-components";
import { v } from "../../styles/variables";

export const SSidebar = styled.div`
  width: 270px; /* Thay vì sử dụng biến v.sidebarWidth */
  min-width: 270px;
  max-width: 270px;
  background: ${({ theme }) => theme.bg};
  height: 100vh;
  padding: ${v.lgSpacing};
  position: sticky;
  overflow: hidden; /* Ngăn nội dung bị tràn */
`;

// export const SSidebarButton = styled.div`
//   ${btnReset};
//   position: absolute;
//   top: ${v.xxlSpacing};
//   right: ${({ isOpen }) => (isOpen ? `-16px` : `-40px`)};
//   width: 32px;
//   height: 32px;
//   border-radius: 50%;
//   background: ${({ theme }) => theme.bg};
//   box-shadow: 0 0 4px ${({ theme }) => theme.bg3},
//     0 0 7px ${({ theme }) => theme.bg};
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   cursor: pointer;
//   transform: initial;
// `;

export const SLogo = styled.div`
  width: 200px;
  img {
    max-width: 100%;
    height: auto;
  }
  cursor: pointer;

  margin-bottom: ${v.lgSpacing};
`;

// export const SSSearch = styled.div`
//   background: ${({ theme }) => theme.bgAlpha};
//   border: 1px solid ${({ theme }) => theme.bg3};
//   border-radius: ${v.borderRadius};
//   input {
//     padding: 0 ${v.smSpacing};
//     font-family: inherit;
//     letter-spacing: inherit;
//     font-size: 16px;
//     width: 100%;
//     outline: none;
//     border: none;
//     color: inherit;
//     background: transparent;
//   }
//   display: flex;
// `;

// export const SSSearchIcon = styled.button`
//   ${btnReset}
//   padding: calc(${v.mdSpacing} - 2px) ${v.mdSpacing};
//   display: flex;
//   cursor: pointer;
//   svg {
//     font-size: 20px;
//   }
// `;

export const SDivider = styled.div`
  height: 3px;
  width: 15%;
  background: ${({ theme }) => theme.bg3};
  margin: calc(${v.lgSpacing}) 0;
  margin-right: 20px;
`;

export const SItem = styled.div`
  display: flex;
  color: inherit;
  font-size: 17px;
  align-items: center;
  font-weight: 500;
`;

export const SLinkContainer = styled.div`
  background: ${({ theme, isActive }) =>
    !isActive ? `transparent` : theme.bg3};
  border-radius: ${v.borderRadius};
  margin: 9px 0;

  :hover {
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.bg3};
  }
`;

export const SLink = styled.a`
  display: flex;
  align-items: center;
  padding: 10px 15px;
  text-decoration: none;
  color: #333;
  border-radius: 8px;

  &:hover {
    background: #f0f0f0;
  }

  &.active {
    background: #e0e0e0; /* Màu xám như hình */
  }
`;

export const SLinkIcon = styled.div`
  padding: ${v.smSpacing} ${v.smSpacing};
  display: flex;
  svg {
    font-size: 20px;
  }
`;

export const SLinkLabel = styled.span`
  display: block;
  flex: 1;
  margin-left: ${v.smSpacing};
  font-size: 17px;
  font-weight: 500;
`;

export const SLinkNotification = styled.div`
  font-size: 14px;
  padding: calc(${v.smSpacing} / 2) ${v.smSpacing};
  border-radius: calc(${v.borderRadius} / 2);
  background: ${({ theme }) => theme.primary};
  color: white;

  margin-right: ${v.mdSpacing};
`;

export const STheme = styled.div`
  display: flex;
  align-items: center;
  font-size: 16px;
`;

export const SThemeLabel = styled.div`
  display: block;
  flex: 1;
`;

export const SToggleThumb = styled.div`
  height: 18px;
  width: 18px;
  position: absolute;
  top: 1px;
  bottom: 1px;
  transition: 0.2s ease right;
  right: calc(100% - 18px - 1px);
  border-radius: 50%;
  background: ${({ theme }) => theme.bg};
`;
