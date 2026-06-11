function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  try {
    var data = JSON.parse(e.postData.contents);
    var name = data.name; // 사용자 이름 (예: "상현", "창민")
    var date = data.date; // 날짜 (형식: "YYYY-MM-DD" 또는 "M/D"에 매핑할 수 있는 문자열)
    var status = data.status; // 참석여부 ("available", "maybe", "unavailable", 또는 선택해제인 경우 null/undefined/"" 등)
    
    if (!name || !date) {
      return ContentService.createTextOutput(JSON.stringify({
        result: "error",
        message: "Missing name or date"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 1. 구글 시트의 첫 번째 행(Header)에서 해당 날짜 컬럼 인덱스 찾기
    // 시트 날짜 형식 매핑 예: "2026-07-01" -> "7/1", "2026-08-15" -> "8/15"
    var formattedDate = convertDateToHeaderFormat(date);
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colIndex = -1;
    for (var i = 0; i < headers.length; i++) {
      var headerVal = headers[i].toString();
      // "7/1(수" 등 괄호가 붙어 있는 경우가 있으므로 startWith 등으로 유연하게 비교합니다.
      if (headerVal.indexOf(formattedDate) === 0 || headerVal === formattedDate) {
        colIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (colIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        result: "error",
        message: "Date column not found: " + formattedDate
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. 구글 시트의 첫 번째 열(A열)에서 사용자 이름 행 인덱스 찾기
    var names = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
    var rowIndex = -1;
    for (var j = 0; j < names.length; j++) {
      if (names[j][0].toString().trim() === name.trim()) {
        rowIndex = j + 1; // 1-based index
        break;
      }
    }
    
    // 만약 사용자가 행에 없으면 마지막에 추가합니다.
    if (rowIndex === -1) {
      sheet.appendRow([name]);
      rowIndex = sheet.getLastRow();
    }
    
    // 3. 참석이면 1, 미정이면 0.5 (또는 빈값), 불가/선택해제면 빈값 표시
    var displayValue = "";
    if (status === "available") {
      displayValue = 1;
    } else if (status === "maybe") {
      displayValue = ""; // 미정도 1이 아니면 빈값으로 비워둠 (원할 경우 "0.5" 등으로 설정 가능하나, 요구사항은 "참석이면 1로 표시")
    } else {
      displayValue = "";
    }
    
    // 셀 값 업데이트
    sheet.getRange(rowIndex, colIndex).setValue(displayValue);
    
    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      name: name,
      date: formattedDate,
      rowIndex: rowIndex,
      colIndex: colIndex,
      value: displayValue
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// "2026-07-01" 형식을 "7/1"로 변환하는 헬퍼 함수
function convertDateToHeaderFormat(dateStr) {
  // dateStr: "2026-07-01"
  var parts = dateStr.split("-");
  if (parts.length === 3) {
    var month = parseInt(parts[1], 10);
    var day = parseInt(parts[2], 10);
    return month + "/" + day; // 예: "7/1"
  }
  return dateStr;
}
