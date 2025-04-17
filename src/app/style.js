"use client";

import styled from "styled-components";

export const SetUp = styled.div``;

export const SContainer = styled.div`
  width: 100%;
  padding: 2rem;
  padding-bottom: 50px;
  background-color: ${({ theme }) => theme.bg};
  border-radius: 15px;
  box-sizing: border-box;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1),
    /* Đổ bóng chìm nhẹ */ 0px 2px 4px rgba(0, 0, 0, 0.06);
`;
