import styled from 'styled-components';

const VisuallyHiddenText = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  top: 0;
`;

export default VisuallyHiddenText;