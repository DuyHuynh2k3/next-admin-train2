import styled from "styled-components";
import { btnReset, v } from "../../styles/variables";

export const SSSearch = styled.div`
  background: ${({ theme }) => theme.bgAlpha};
  border: 1px solid ${({ theme }) => theme.bg3};
  border-radius: ${v.borderRadius};
  width: 400px;
  margin-bottom: 15px;
  cursor: pointer;
  input {
    padding: 0 ${v.smSpacing};
    font-family: inherit;
    letter-spacing: inherit;
    font-size: 16px;
    width: 100px;
    outline: none;
    border: none;
    color: inherit;
    background: transparent;
  }
  display: flex;
`;

export const SSSearchIcon = styled.button`
  ${btnReset}
  display: flex;
  cursor: pointer;
  svg {
    font-size: 20px;
  }
`;

export const SContainer = styled.div`
  width: 100%;
  padding: 4rem 1rem;
  background-color: ${({ theme }) => theme.bg};
  border-radius: 15px;
  box-sizing: border-box;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1),
    /* Đổ bóng chìm nhẹ */ 0px 2px 4px rgba(0, 0, 0, 0.06);
`;
