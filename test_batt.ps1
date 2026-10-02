powercfg /batteryreport /xml /output "batteryreport.xml"
[xml]$xml = Get-Content "batteryreport.xml"
$b = $xml.BatteryReport.Batteries.Battery[0]
Write-Output "Full: $($b.FullChargeCapacity)"
Write-Output "Design: $($b.DesignCapacity)"
Write-Output "Cycle: $($b.CycleCount)"
