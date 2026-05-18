using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OffsureManagementSystem.Infrastructure
{
    public class EmailSettings
    {
        public string From { get; set; }
        public string To { get; set; }
        public string Password { get; set; }
        public string Host { get; set; }
        public int Port { get; set; }
        public bool EnableSSL { get; set; } = true;
    }

}
