package naomi

import (
	"bufio"
	"encoding/binary"
	"fmt"
	"hash/crc32"
	"net"
	"os"
)

func ConnectAndUploadRomToNaomi(ip string, filepath string) error {
	readWriter, Connection, err := Connect(ip)
	if err != nil {
		return err
	}
	fmt.Println("Connected to Naomi")
	err = SetHostMode(readWriter, 0, 1)
	if err != nil {
		return err
	}
	err = UploadDimmFileZeroKey(readWriter, filepath)
	if err != nil {
		return err
	}
	fmt.Println("DIMM file uploaded successfully")
	err = HostReboot(readWriter)
	if err != nil {
		return err
	}
	fmt.Println("Reboot command sent to Naomi")
	err = SetTimeLimit(readWriter, 10*60*1000) // Set time limit to 10 minutes
	if err != nil {
		return err
	}
	fmt.Println("Time limit set successfully")
	// Close the connection
	fmt.Printf("File %s uploaded successfully, closing connection", filepath)
	defer Connection.Close()
	return nil
}

func Connect(ip string) (*bufio.ReadWriter, net.Conn, error) {
	conn, err := net.Dial("tcp", ip+":10703")
	if err != nil {
		return nil, nil, fmt.Errorf("Failure occured in attempting to connecto to naomi at %w: "+err.Error(), ip)
	}
	reader := bufio.NewReader(conn)
	writer := bufio.NewWriter(conn)
	rw := bufio.NewReadWriter(reader, writer)
	return rw, conn, nil
}

func ReadData(rw *bufio.ReadWriter, byteLength int) ([]byte, error) {
	data := make([]byte, byteLength)
	totalRead := 0

	for totalRead < byteLength {
		bytesRead, err := rw.Read(data[totalRead:])
		if err != nil {
			return nil, fmt.Errorf("failed to read data: %w", err)
		}
		totalRead += bytesRead
	}

	return data, nil
}

func WriteData(rw *bufio.ReadWriter, dataToSend any) error {
	switch v := dataToSend.(type) {
	case []byte:
		// If dataToSend is a byte slice, write it directly
		_, err := rw.Write(v)
		if err != nil {
			return fmt.Errorf("failed to write byte slice: %w", err)
		}
	case []any:
		// If dataToSend is a slice of any type, iterate and write each item
		for _, item := range v {
			err := binary.Write(rw, binary.LittleEndian, item)
			if err != nil {
				return fmt.Errorf("failed to write item: %w", err)
			}
		}
	default:
		err := binary.Write(rw, binary.LittleEndian, dataToSend)
		if err != nil {
			return fmt.Errorf("failed to write data: %w", err)
		}
	}
	err := rw.Flush()
	if err != nil {
		err = fmt.Errorf("failed to flush")
	}
	return err
}

func HostReboot(rw *bufio.ReadWriter) error {
	rebootCommand := uint32(0x0A000000)
	err := WriteData(rw, rebootCommand)
	if err != nil {
		err = fmt.Errorf("failed to send reboot command: %w", err)
	}
	return err
}

func SetHostMode(rw *bufio.ReadWriter, v_and, v_or uint32) error {
	modeCommand := uint32(0x07000004)
	modeValue := (v_and << 8) | v_or
	commandStream := []any{modeCommand, modeValue}
	err := WriteData(rw, commandStream)
	if err != nil {
		return fmt.Errorf("failed to send mode command: %w", err)
	}
	return nil
}

func SetSecurityKey(rw *bufio.ReadWriter, data uint64) error {
	keyCommand := uint32(0x7F000008)
	commandStream := make([]byte, 12)
	binary.LittleEndian.PutUint32(commandStream[0:4], keyCommand)
	binary.LittleEndian.PutUint64(commandStream[4:12], data)
	err := WriteData(rw, commandStream)
	if err != nil {
		return fmt.Errorf("failed to send security key command: %w", err)
	}
	return nil
}

func SetTimeLimit(rw *bufio.ReadWriter, milliseconds uint32) error {
	timeLimitCommand := uint32(0x17000004)
	commandStream := []any{timeLimitCommand, milliseconds}
	err := WriteData(rw, commandStream)
	if err != nil {
		return fmt.Errorf("failed to send time limit command: %w", err)
	}
	return nil
}

func SetDimmInformation(rw *bufio.ReadWriter, crc uint32, length uint32) error {
	dimmInfoCommand := uint32(0x1900000C)
	commandStream := []any{dimmInfoCommand, crc, length, uint32(0)}
	err := WriteData(rw, commandStream)
	if err != nil {
		return fmt.Errorf("failed to send Set DIMM information command: %w", err)
	}
	return nil
}

func UploadDimmData(rw *bufio.ReadWriter, address uint32, data []byte, markEnd bool) error {
	mark := 0
	if markEnd {
		mark = 1
	}
	dimmUploadCommand := uint32(0x04800000 | (len(data) + 0xA) | mark<<16)
	commandStream := make([]byte, 14+len(data))
	binary.LittleEndian.PutUint32(commandStream[0:4], dimmUploadCommand)
	binary.LittleEndian.PutUint32(commandStream[4:8], 0) // Placeholder for the second field
	binary.LittleEndian.PutUint32(commandStream[8:12], address)
	binary.LittleEndian.PutUint16(commandStream[12:14], uint16(0)) // Placeholder for the last field
	_ = copy(commandStream[14:], data)

	err := WriteData(rw, commandStream)
	if err != nil {
		return fmt.Errorf("failed to send DIMM upload command: %w", err)
	}

	return nil
}

func UploadDimmFileZeroKey(rw *bufio.ReadWriter, filepath string) error {
	SetSecurityKey(rw, 0)
	file, err := os.Open(filepath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	address := 0
	crc := uint32(0)

	for {
		fmt.Print("Reading file at address: ", address, "\n")
		// Read a chunk of data from the file
		data := make([]byte, 0x8000)
		n, err := file.ReadAt(data, int64(address))
		if err != nil {
			if err.Error() == "EOF" {
				break
			}
			return fmt.Errorf("failed to read file: %w", err)
		}
		if n == 0 {
			break
		}

		err = UploadDimmData(rw, uint32(address), data[:n], false)
		if err != nil {
			return fmt.Errorf("failed to upload DIMM data: %w", err)
		}

		crc = crc32.Update(crc, crc32.IEEETable, data[:n])
		address += n
	}

	fmt.Print("Finalizing upload with address: ", address, "\n")
	// Upload the final data with a mark to indicate the end
	err = UploadDimmData(rw, uint32(address), []byte("12345678"), true)
	if err != nil {
		return fmt.Errorf("failed to upload final DIMM data: %w", err)
	}
	// Finalize the CRC and set DIMM information
	fmt.Print("Setting DIMM information with CRC: ", crc, " and address: ", address, "\n")
	crc = ^crc
	err = SetDimmInformation(rw, crc, uint32(address))
	if err != nil {
		return fmt.Errorf("failed to set DIMM information: %w", err)
	}

	return nil
}
